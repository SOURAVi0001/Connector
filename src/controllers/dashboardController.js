const pool = require('../config/database');


const getAllData = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM sheet_data');  
    client.release();

    res.status(200).json(result.rows);  
  } catch (err) {
    console.error('Error fetching data from PostgreSQL:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, color, category, price } = req.body;

  try {
    const client = await pool.connect();
    const query = 'UPDATE products SET name = $1, color = $2, category = $3, price = $4 WHERE id = $5';
    const values = [name, color, category, price, id];

    await client.query(query, values);
    client.release();

    res.status(200).json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { getAllData, updateProduct };
