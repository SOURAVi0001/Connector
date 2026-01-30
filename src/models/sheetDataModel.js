const pool = require('../config/database');


const executeQuery = async (query, values = []) => {
  try {
    return await pool.query(query, values);
  } catch (err) {
    console.error('Error executing query:', err.message);
    throw err;
  }
};


const doesTriggerExist = async (triggerName, tableName) => {
  const query = `
    SELECT EXISTS (
      SELECT 1 
      FROM pg_trigger 
      WHERE tgname = $1 
      AND tgrelid = (SELECT oid FROM pg_class WHERE relname = $2)
    );
  `;
  const result = await executeQuery(query, [triggerName, tableName]);
  return result.rows[0].exists;
};


const createSheetTable = async () => {
  try {
    await executeQuery(`
      
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS sheet_data (
        id SERIAL PRIMARY KEY,
        sync_id UUID DEFAULT uuid_generate_v4() UNIQUE, -- Stable ID for sync
        name VARCHAR(255),
        roll INT,
        marks VARCHAR(50),
        remarks VARCHAR(255),
        sports VARCHAR(255), -- Added to support user request
        sheet_name VARCHAR(255) NOT NULL,
        row_num INT, -- Kept for reference, but not for identity
        
        -- Audit & Sync Metadata
        source VARCHAR(50) DEFAULT 'system', -- 'sheet', 'db', 'system'
        version INT DEFAULT 1, -- Optimistic locking
        last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP DEFAULT NULL,
        
        UNIQUE (sheet_name, row_num) 
      );
    `);
    console.log('Table created successfully.');

    
    const triggerExists = await doesTriggerExist('notify_url_trigger', 'sheet_data');

    if (!triggerExists) {
      
      await executeQuery(`
        CREATE OR REPLACE FUNCTION notify_url()
        RETURNS TRIGGER AS $$
        DECLARE
          payload json;
        BEGIN
          IF TG_OP = 'DELETE' AND OLD.source IS DISTINCT FROM 'API Request' THEN
            -- Notify when a row is deleted and source is not 'API Request'
            payload := json_build_object(
              'action', 'DELETE',
              'id', OLD.id,
              'sheet_name', OLD.sheet_name,
              'row_num', OLD.row_num,
              'name', OLD.name,
              'roll', OLD.roll,
              'marks', OLD.marks,
              'remarks', OLD.remarks,
              'timestamp', OLD.last_modified
            );
            PERFORM pg_notify('row_changed', payload::text);
          ELSIF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.source IS DISTINCT FROM 'API Request' THEN
            -- Notify on insert or update and source is not 'API Request'
            payload := json_build_object(
              'action', TG_OP,
              'id', NEW.id,
              'sheet_name', NEW.sheet_name,
              'row_num', NEW.row_num,
              'name', NEW.name,
              'roll', NEW.roll,
              'marks', NEW.marks,
              'remarks', NEW.remarks,
              'timestamp', NEW.last_modified
            );
            PERFORM pg_notify('row_changed', payload::text);
          END IF;
          RETURN CASE
            WHEN TG_OP = 'DELETE' THEN OLD
            ELSE NEW
          END; 
        END;
        $$ LANGUAGE plpgsql;
      `);
      console.log('Trigger function created successfully.');

      
      await executeQuery(`
        CREATE TRIGGER notify_url_trigger
        AFTER INSERT OR UPDATE OR DELETE ON sheet_data
        FOR EACH ROW
        EXECUTE FUNCTION notify_url();
      `);
      console.log('Trigger created successfully.');
    } else {
      console.log('Trigger already exists, skipping creation.');
    }
  } catch (err) {
    console.error('Error creating table or trigger:', err.message);
    throw err;
  }
};


const syncTableSchema = async (columns) => {
  
  const res = await executeQuery(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'sheet_data';
  `);

  const existingColumns = new Set(res.rows.map(r => r.column_name.toLowerCase()));

  
  const systemColumns = new Set(['id', 'sync_id', 'sheet_name', 'row_num', 'source', 'version', 'last_modified', 'deleted_at']);

  const incomingColumnsSet = new Set(columns.map(c => c.toLowerCase()));

  
  for (const col of columns) {
    const colName = col.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    if (systemColumns.has(colName) || existingColumns.has(colName)) continue;

    console.log(`Auto-detected new column: "${colName}". Adding to schema...`);
    try {
      await executeQuery(`ALTER TABLE sheet_data ADD COLUMN "${colName}" TEXT`);
      existingColumns.add(colName); // Update local set
    } catch (err) {
      console.warn(`Could not add column ${colName}: ${err.message}`);
    }
  }

  
  if (columns && columns.length > 0) { 
    for (const existingCol of existingColumns) {
      if (systemColumns.has(existingCol)) continue;

      if (!incomingColumnsSet.has(existingCol)) {
        console.log(`Column "${existingCol}" missing from sheet. Dropping from schema...`);
        try {
          await executeQuery(`ALTER TABLE sheet_data DROP COLUMN "${existingCol}"`);
        } catch (err) {
          console.warn(`Could not drop column ${existingCol}: ${err.message}`);
        }
      }
    }
  }
};


const insertOrUpdateRow = async ({ sheetName, row, data, columns, syncId = null }) => {
  try {
    
    await syncTableSchema(columns);

    
    const cleanData = {};
    Object.keys(data).forEach(k => {
      if (data[k] !== undefined) {
        const cleanKey = k.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        cleanData[cleanKey] = data[k];
      }
    });

    const dataKeys = Object.keys(cleanData);
    if (dataKeys.length === 0) return; 

    
    const fieldNames = ['sheet_name', 'row_num', 'source', 'version', 'sync_id', ...dataKeys];
    const placeholders = fieldNames.map((_, i) => `$${i + 1}`);

    
    const values = [
      sheetName,
      row,
      'sheet',
      1,
      syncId
    ];

    const dbCols = ['sheet_name', 'row_num', 'source', 'version', 'sync_id', ...dataKeys];
    const dbVals = [sheetName, row, 'sheet', 1, syncId, ...dataKeys.map(c => cleanData[c])];

    
    const valuePlaceholders = dbCols.map((col, i) => {
      if (col === 'sync_id') return `COALESCE($${i + 1}, uuid_generate_v4())`;
      return `$${i + 1}`;
    });

    const setClauses = dataKeys.map((col, i) => `${col} = EXCLUDED.${col}`);

    const query = `
      INSERT INTO sheet_data (${dbCols.join(', ')})
      VALUES (${valuePlaceholders.join(', ')})
      ON CONFLICT (sheet_name, row_num)
      DO UPDATE SET
        ${setClauses.join(', ')},
        last_modified = CURRENT_TIMESTAMP,
        source = 'sheet',
        version = sheet_data.version + 1,
        deleted_at = NULL
      WHERE 
        sheet_data.source != 'db'
        OR sheet_data.last_modified < CURRENT_TIMESTAMP - INTERVAL '1 second';
    `;

    await executeQuery(query, dbVals);
    console.log('Row synced successfully with dynamic schema.');

  } catch (err) {
    console.error('Error syncing row:', err.message);
    throw err;
  }
};


const deleteRowFromDB = async ({ sheetName, row }) => {
  try {
    const result = await executeQuery(`
      DELETE FROM sheet_data
      WHERE sheet_name = $1 AND row_num = $2
    `, [sheetName, row]);

    if (result.rowCount === 0) {
      console.log('No row found to delete.');
    } else {
      console.log('Row deleted successfully:', result.rowCount);
    }
  } catch (err) {
    console.error('Error deleting row from DB:', err.message);
    throw err;
  }
};


const updateCellInRow = async ({ sheetName, row, column }) => {
  try {
    
    const result = await executeQuery(`
      SELECT row_data
      FROM sheet_data
      WHERE sheet_name = $1 AND row_num = $2
    `, [sheetName, row]);

    if (result.rowCount === 0) {
      console.log('No row found to update.');
      return;
    }

    const rowData = result.rows[0].row_data;
    rowData[column - 1] = ""; 

    
    await executeQuery(`
      UPDATE sheet_data
      SET row_data = $1, timestamp = CURRENT_TIMESTAMP, source = 'API Request'  
      WHERE sheet_name = $2 AND row_num = $3
    `, [JSON.stringify(rowData), sheetName, row]);

    console.log('Cell updated to NULL successfully.');
  } catch (err) {
    console.error('Error updating cell in row:', err.message);
    throw err;
  }
};

module.exports = { createSheetTable, insertOrUpdateRow, deleteRowFromDB, updateCellInRow };
