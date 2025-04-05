/**
 * Reports Service
 * Handles report-related operations and schema management
 */
const db = require('./db');

/**
 * Ensure all report-related tables exist in database
 */
async function ensureReportTablesExist() {
  try {
    console.log('Checking if report tables exist...');
    
    // Check if report table exists
    const [reportTableExists] = await db.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'report'
    `);
    
    // Create report table if it doesn't exist
    if (reportTableExists[0].count === 0) {
      console.log('Creating report table...');
      await db.query(`
        CREATE TABLE report (
          report_id INT AUTO_INCREMENT PRIMARY KEY,
          reporter_id INT NOT NULL,
          reporter_type ENUM('passenger', 'driver', 'admin') NOT NULL,
          reported_id INT NOT NULL,
          reported_type ENUM('passenger', 'driver', 'admin') NOT NULL,
          report_type ENUM('inappropriate_behavior', 'safety_concern', 'fraud', 'other') NOT NULL,
          description TEXT NOT NULL,
          ride_id INT,
          status ENUM('pending', 'investigating', 'resolved', 'dismissed') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          resolved_by INT,
          resolution_notes TEXT,
          INDEX idx_reporter (reporter_id, reporter_type),
          INDEX idx_reported (reported_id, reported_type),
          INDEX idx_ride (ride_id),
          INDEX idx_status (status)
        );
      `);
      console.log('Report table created successfully!');
    } else {
      console.log('Report table already exists.');
    }
    
    return true;
  } catch (error) {
    console.error('Error setting up report tables:', error);
    throw error;
  }
}

/**
 * Create a new report
 * @param {number} reporterId - ID of the user making the report
 * @param {string} reporterType - Type of the reporting user (passenger, driver, admin)
 * @param {number} reportedId - ID of the user being reported
 * @param {string} reportedType - Type of the reported user (passenger, driver, admin)
 * @param {string} reportType - Type of report
 * @param {string} description - Report description
 * @param {number|null} rideId - Optional ride ID associated with this report
 * @returns {Promise<Object>} Result with the report ID
 */
async function createReport(reporterId, reporterType, reportedId, reportedType, reportType, description, rideId = null) {
  try {
    const [result] = await db.query(
      `INSERT INTO report 
       (reporter_id, reporter_type, reported_id, reported_type, report_type, description, ride_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [reporterId, reporterType, reportedId, reportedType, reportType, description, rideId]
    );
    
    return {
      success: true,
      reportId: result.insertId
    };
  } catch (error) {
    console.error('Error creating report:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get reports by status
 * @param {string} status - Report status
 * @returns {Promise<Array>} Array of reports
 */
async function getReportsByStatus(status) {
  try {
    const [reports] = await db.query(
      `SELECT * FROM report WHERE status = ? ORDER BY created_at DESC`,
      [status]
    );
    return reports;
  } catch (error) {
    console.error('Error getting reports by status:', error);
    throw error;
  }
}

/**
 * Update report status
 * @param {number} reportId - Report ID
 * @param {string} status - New status
 * @param {number} resolvedBy - Admin ID who resolved the report
 * @param {string} notes - Resolution notes
 * @returns {Promise<Object>} Result of the operation
 */
async function updateReportStatus(reportId, status, resolvedBy = null, notes = null) {
  try {
    await db.query(
      `UPDATE report 
       SET status = ?, resolved_by = ?, resolution_notes = ? 
       WHERE report_id = ?`,
      [status, resolvedBy, notes, reportId]
    );
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating report status:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  ensureReportTablesExist,
  createReport,
  getReportsByStatus,
  updateReportStatus
}; 