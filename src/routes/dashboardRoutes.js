const express = require('express');
const { getAllData, updateProduct } = require('../controllers/dashboardController');

const router = express.Router();
router.get('/products', getAllData);
router.put('/products/:id', updateProduct);

module.exports = router;
