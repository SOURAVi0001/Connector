
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); 
const sheetRoutes = require('./routes/googleSheetsRoutes');
const { createSheetTable } = require('./models/sheetDataModel');
const { listenForNotifications } = require('./utils/dbNotificationListener'); 
const errorHandler = require('./middlewares/errorHandler');
const dashboardRoutes = require('./routes/dashboardRoutes');
require('dotenv').config();

const app = express();


app.use(cors()); 
app.use(bodyParser.json());


app.use('/api/sheets', sheetRoutes);
app.use('/api/dashboard', dashboardRoutes);


app.use(errorHandler);


const PORT = process.env.PORT || 3012;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await createSheetTable(); 
  listenForNotifications(); 
});
