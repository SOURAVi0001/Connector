const pool = require('../config/database');
const { updateGoogleSheet } = require('../services/googleSheetsClient');

const listenForNotifications = async () => {
  const client = await pool.connect();
  try {
    
    await client.query('LISTEN row_changed');
    console.log('Listening for database changes...');

    client.on('notification', async (msg) => {
      try {
        const data = JSON.parse(msg.payload);
        console.log('Notification received:', data);

        if (data.action === 'DELETE') {
          console.log(`Row deleted: Row number ${data.row_num}`);

          
          await updateGoogleSheet(data.sheet_name, data.row_num, []);
        } else {
          console.log('Row change details:', data);

          
          const rowValues = [data.name, data.roll, data.marks, data.remarks];
          await updateGoogleSheet(data.sheet_name, data.row_num, rowValues);
        }
      } catch (err) {
        console.error('Error processing notification:', err);
      }
    });
  } catch (err) {
    console.error('Error listening for notifications:', err);
  } finally {

  }
};

module.exports = { listenForNotifications };
