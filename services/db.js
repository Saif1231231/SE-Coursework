require("dotenv").config();
const mysql = require("mysql2/promise");

// Enhanced Database Configuration with flexible environments
const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
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

// Create a MySQL Connection Pool
let pool;

try {
  pool = mysql.createPool(config.db);
  console.log("MySQL pool created successfully");
} catch (error) {
  console.error("❌ Error creating MySQL pool:", error.message);
  process.exit(1); // Exit if we can't create the pool
}

// Test Database Connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ MySQL Database Connected Successfully!");
    
    // Test query to ensure we can actually execute queries
    const [rows] = await connection.query('SELECT 1 as testValue');
    console.log("✅ Query test successful:", rows);
    
    connection.release();
  } catch (error) {
    console.error("❌ MySQL Connection Error in db.js:", error.message);
    console.error("Check your database is running with the correct credentials");
    // Don't throw here - let the app continue trying
  }
}

// Run the connection test
testConnection();

// Wrapper for database queries with better error handling
async function query(sql, params) {
  try {
    console.log('Executing SQL:', sql);
    console.log('With parameters:', params);
    
    // Check if pool is available
    if (!pool) {
      throw new Error("Database connection pool not initialized");
    }
    
    const [results] = await pool.execute(sql, params);
    console.log('Query results:', results);
    return [results];
  } catch (error) {
    console.error('Query error:', error.stack);
    throw error;
  }
}

// Export Query Function for Database Operations
module.exports = {
  query,
  pool
};

