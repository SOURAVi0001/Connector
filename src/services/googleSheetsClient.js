const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();


const sheets = google.sheets('v4');
const credentials = require(path.join(__dirname, '../config/googleSheetsCredentials.json')); 

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheetsClient = async () => {
  return await auth.getClient();
};


const updateGoogleSheet = async (sheetName, rowNum, rowData) => {
  try {
    const client = await sheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID; 

    const request = {
      auth: client,
      spreadsheetId,
      range: `'${sheetName}'!A${rowNum}:Z${rowNum}`, 
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [rowData],
      },
    };

    const response = await sheets.spreadsheets.values.update(request);
    console.log('Google Sheet updated:', response.data);
  } catch (err) {
    console.error('Error updating Google Sheet:', err);
  }
};

module.exports = { updateGoogleSheet };
