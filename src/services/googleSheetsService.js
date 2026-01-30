const { insertOrUpdateRow, deleteRowFromDB, updateCellInRow } = require('../models/sheetDataModel');
const { validateGoogleSheetData } = require('../utils/validateData');

const processGoogleSheetUpdate = async (data) => {
  
  const { valid, message } = validateGoogleSheetData(data);
  if (!valid) throw new Error(message);

  
  const headers = data.entireSheetData && data.entireSheetData.length > 0
    ? data.entireSheetData[0].map(h => h.toString().toLowerCase().trim())
    : [];

 
  const rowObject = {};

  headers.forEach((header, index) => {
    if (!header) return; 

    
    let val = data.rowData[index];
    if (val === undefined || val === "") val = null;

    rowObject[header] = val;
  });

  
  await insertOrUpdateRow({
    sheetName: data.sheetName,
    row: data.row,
    data: rowObject,
    columns: headers, 
  });
};

const handleGoogleSheetData = async ({ sheetName, row, column, rowData }) => {
  try {
    const isRowEmpty = rowData.every(cell => !cell); 

    if (isRowEmpty) {
      
      await deleteRowFromDB({ sheetName, row });
    } else {
      
      if (!rowData[column - 1]) {  
        await updateCellInRow({ sheetName, row, column });
      }
    }
  } catch (err) {
    console.error('Error in handleGoogleSheetData service:', err);
    throw err;
  }
};



module.exports = { processGoogleSheetUpdate, handleGoogleSheetData };
