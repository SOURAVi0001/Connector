function onEditt(e) {
  if (!e) {
    Logger.log("No event object available.");
    return;
  }

  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();
  const range = e.range;
  const rowData = sheet.getRange(range.getRow(), 1, 1, sheet.getLastColumn()).getValues()[0];
  const editedCells = range.getValues();

  const isDeleted = editedCells.every(row => row.every(cell => cell === ""));

  const BASE_URL = 'https://ecological-jacqui-relevant.ngrok-free.dev'; 

  const payload = {
    timestamp: new Date(),
    sheetName: sheetName,
    row: range.getRow(),
    column: range.getColumn(),
    rowData: rowData,
    entireSheetData: sheet.getDataRange().getValues()
  };

  const url = isDeleted
    ? `${BASE_URL}/api/sheets/deletedata`
    : `${BASE_URL}/api/sheets/data`;

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch (error) {
    Logger.log("Error sending data: " + error.message);
  }
}