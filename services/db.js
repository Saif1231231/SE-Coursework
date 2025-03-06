require("dotenv").config();
const mysql = require('mysql2/promise');

const config = {
  db: {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'newpassword',  // ✅ Replace with your actual password
    database: 'ridesharing',
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0,
  },
};

console.log("Connecting to MySQL with:", config.db);

const pool = mysql.createPool(config.db);

// Test the connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ MySQL Database Connected Successfully");
    connection.release();
  } catch (error) {
    console.error("❌ MySQL Connection Error:", error.message);
  }
}

testConnection();

module.exports = {
  query: async (sql, params) => {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },
};
