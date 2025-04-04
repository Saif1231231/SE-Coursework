require("dotenv").config();
const mysql = require("mysql2/promise");

// ✅ Database Configuration - With Docker/Local Support
const config = {
  db: {
    host: process.env.NODE_ENV === 'docker' ? process.env.DB_HOST : 'localhost',
    port: process.env.NODE_ENV === 'docker' ? process.env.DB_PORT : 3309,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "newpassword",
    database: process.env.DB_NAME || "ridesharing",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },
};

// Debug DB Connection Details
console.log('Database connection details:');
console.log(`Host: ${config.db.host}`);
console.log(`Port: ${config.db.port}`);
console.log(`User: ${config.db.user}`);
console.log(`Database: ${config.db.database}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

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
    throw error;
  }
}

// Run the connection test
testConnection();

// Wrapper for database queries
async function query(sql, params) {
  try {
    console.log('Executing SQL:', sql);
    console.log('With parameters:', params);
    const [results] = await pool.execute(sql, params);
    console.log('Query results:', results);
    return [results];
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

// ✅ Export Query Function for Database Operations
module.exports = {
  query,
  pool
};

