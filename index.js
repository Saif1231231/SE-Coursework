"use strict";

// Include the app.js file.
// This will run the code.
console.log("entrypoint");
const app = require("./app/app");

// Now app should handle all routes and server initialization

// Ensure report tables exist
const reportService = require('./services/reports');
(async () => {
  try {
    await reportService.ensureReportTablesExist();
    console.log('Report tables setup completed!');
  } catch (err) {
    console.error('Error setting up report tables:', err);
  }
})();