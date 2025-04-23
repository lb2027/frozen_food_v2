const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'frozenfood',
  password: 'password',
  port: 5432,
});

app.set('view engine', 'ejs'); // pakai EJS untuk templating
app.use(express.static('public')); // folder untuk css dan js

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM produk');
    res.render('index', { produk: result.rows });
  } catch (err) {
    res.send('Error: ' + err);
  }
});

app.listen(port, () => {
  console.log(`Server jalan di http://localhost:${port}`);
});

