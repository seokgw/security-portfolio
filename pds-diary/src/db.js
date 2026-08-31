const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'pds_diary',
  charset: 'utf8mb4', waitForConnections: true, connectionLimit: 10, dateStrings: true
});
pool.on('connection', connection => connection.query("SET time_zone = '+09:00'"));
module.exports = pool;
