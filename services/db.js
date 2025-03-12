require("dotenv").config();
const mysql = require("mysql2/promise");

// ✅ Database Configuration
const config = {
  db: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "newpassword",  // ✅ Ensure this matches your MySQL password
    database: process.env.DB_NAME || "ridesharing",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },
};

// ✅ Create a MySQL Connection Pool
const pool = mysql.createPool(config.db);

// ✅ Debugging: Test Database Connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ MySQL Database Connected Successfully!");
    connection.release();
  } catch (error) {
    console.error("❌ MySQL Connection Error in db.js:", error.message);
    process.exit(1); // Exit process if DB fails to connect
  }
}

// Run the connection test
testConnection();

// ✅ Export Query Function for Database Operations
module.exports = {
  query: async (sql, params) => {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error("❌ Database Query Error:", error.message);
      throw error;
    }
  },
};

