const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'thoitranghd_db'
});

async function run() {
  const [rows] = await pool.query('SELECT o.*, u.name, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE u.email = "nguyenvana@gmail.com"');
  console.log(rows);
  process.exit(0);
}
run();
