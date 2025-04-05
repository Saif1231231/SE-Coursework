require("dotenv").config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function setupReviewSystem() {
  console.log('Setting up advanced review system...');
  
  // Read the SQL file
  const sqlFilePath = path.join(__dirname, 'advanced_reviews.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  // Create a connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'newpassword',
    multipleStatements: true // Enable multiple statements for running the SQL file
  });
  
  try {
    // Execute the SQL commands
    console.log('Executing SQL script...');
    await connection.query(sqlContent);
    console.log('✅ Advanced review system setup completed successfully!');
  } catch (error) {
    console.error('❌ Error setting up advanced review system:', error.message);
    if (error.sqlMessage) {
      console.error('SQL Error:', error.sqlMessage);
    }
    process.exit(1);
  } finally {
    // Close the connection
    await connection.end();
  }
}

// Run the script
setupReviewSystem().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 