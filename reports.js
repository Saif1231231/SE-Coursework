const db = require('./db');

/**
 * Ensure report tables exist in the database
 */
async function ensureReportTablesExist() {
    try {
        // Read the SQL file
        const fs = require('fs');
        const path = require('path');
        const sql = fs.readFileSync(path.join(__dirname, '../reports.sql'), 'utf8');
        
        // Split SQL file into individual statements
        const statements = sql.split(';').filter(s => s.trim());
        
        for (let statement of statements) {
            if (statement.trim()) {
                await db.query(statement);
            }
        }
        
        console.log('Report tables setup completed!');
        return true;
    } catch (err) {
        console.error('Error setting up report tables:', err);
        throw err;
    }
}

/**
 * Get all reports with related data
 */
async function getAllReports() {
    try {
        const [reports] = await db.query(`
            SELECT dr.*, 
                   p.name as passenger_name,
                   d.name as driver_name,
                   rc.name as category_name,
                   r.pickup_location,
                   r.dropoff_location,
                   DATE_FORMAT(dr.created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_at
            FROM driver_report dr
            LEFT JOIN passenger p ON dr.passenger_id = p.passenger_id
            LEFT JOIN driver d ON dr.driver_id = d.driver_id
            LEFT JOIN report_category rc ON dr.category_id = rc.category_id
            LEFT JOIN ride r ON dr.ride_id = r.ride_id
            ORDER BY dr.created_at DESC
        `);
        
        return reports;
    } catch (err) {
        console.error('Error fetching reports:', err);
        throw err;
    }
}

/**
 * Get reports for a specific passenger
 * @param {number} passengerId - The passenger ID
 */
async function getPassengerReports(passengerId) {
    try {
        const [reports] = await db.query(`
            SELECT dr.*, 
                   d.name as driver_name,
                   rc.name as category_name,
                   r.pickup_location,
                   r.dropoff_location,
                   DATE_FORMAT(dr.created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_at
            FROM driver_report dr
            LEFT JOIN driver d ON dr.driver_id = d.driver_id
            LEFT JOIN report_category rc ON dr.category_id = rc.category_id
            LEFT JOIN ride r ON dr.ride_id = r.ride_id
            WHERE dr.passenger_id = ?
            ORDER BY dr.created_at DESC
        `, [passengerId]);
        
        return reports;
    } catch (err) {
        console.error('Error fetching passenger reports:', err);
        throw err;
    }
}

/**
 * Get reports for a specific driver
 * @param {number} driverId - The driver ID
 */
async function getDriverReports(driverId) {
    try {
        const [reports] = await db.query(`
            SELECT dr.*, 
                   p.name as passenger_name,
                   rc.name as category_name,
                   r.pickup_location,
                   r.dropoff_location,
                   DATE_FORMAT(dr.created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_at
            FROM driver_report dr
            LEFT JOIN passenger p ON dr.passenger_id = p.passenger_id
            LEFT JOIN report_category rc ON dr.category_id = rc.category_id
            LEFT JOIN ride r ON dr.ride_id = r.ride_id
            WHERE dr.driver_id = ?
            ORDER BY dr.created_at DESC
        `, [driverId]);
        
        return reports;
    } catch (err) {
        console.error('Error fetching driver reports:', err);
        throw err;
    }
}

/**
 * Get a specific report by ID with all related data
 * @param {number} reportId - The report ID
 */
async function getReportById(reportId) {
    try {
        const [reports] = await db.query(`
            SELECT dr.*, 
                   p.name as passenger_name, p.passenger_id,
                   d.name as driver_name, d.driver_id,
                   rc.name as category_name,
                   r.pickup_location, r.dropoff_location, 
                   DATE_FORMAT(r.departureTime, '%Y-%m-%d %H:%i:%s') as ride_time,
                   DATE_FORMAT(dr.created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_at
            FROM driver_report dr
            LEFT JOIN passenger p ON dr.passenger_id = p.passenger_id
            LEFT JOIN driver d ON dr.driver_id = d.driver_id
            LEFT JOIN report_category rc ON dr.category_id = rc.category_id
            LEFT JOIN ride r ON dr.ride_id = r.ride_id
            WHERE dr.report_id = ?
        `, [reportId]);
        
        return reports.length ? reports[0] : null;
    } catch (err) {
        console.error('Error fetching report details:', err);
        throw err;
    }
}

/**
 * Create a new report
 * @param {Object} reportData - The report data
 */
async function createReport(reportData) {
    try {
        const { passengerId, driverId, rideId, categoryId, title, description } = reportData;
        
        // Start a transaction
        await db.query("START TRANSACTION");
        
        // Insert report
        const [result] = await db.query(
            `INSERT INTO driver_report (
                passenger_id, driver_id, ride_id, category_id, 
                report_title, report_description
              ) VALUES (?, ?, ?, ?, ?, ?)`,
            [passengerId, driverId, rideId || null, categoryId || null, title, description]
        );
        
        const reportId = result.insertId;
        
        // Commit the transaction
        await db.query("COMMIT");
        
        return reportId;
    } catch (err) {
        // Rollback in case of error
        await db.query("ROLLBACK");
        console.error('Error creating report:', err);
        throw err;
    }
}

/**
 * Add evidence to a report
 * @param {number} reportId - The report ID
 * @param {Object} fileData - The file data
 */
async function addReportEvidence(reportId, fileData) {
    try {
        const { originalname, filename, mimetype, size } = fileData;
        
        await db.query(
            `INSERT INTO report_evidence (
                report_id, file_name, file_path, file_type, file_size
            ) VALUES (?, ?, ?, ?, ?)`,
            [
                reportId, 
                originalname, 
                `/uploads/reports/${filename}`, 
                mimetype, 
                size
            ]
        );
        
        return true;
    } catch (err) {
        console.error('Error adding report evidence:', err);
        throw err;
    }
}

/**
 * Get all comments for a report
 * @param {number} reportId - The report ID
 */
async function getReportComments(reportId) {
    try {
        const [comments] = await db.query(`
            SELECT rc.*, 
                   CASE 
                       WHEN rc.user_type = 'passenger' THEN (SELECT name FROM passenger WHERE passenger_id = rc.user_id)
                       WHEN rc.user_type = 'driver' THEN (SELECT name FROM driver WHERE driver_id = rc.user_id)
                       WHEN rc.user_type = 'admin' THEN (SELECT name FROM admin WHERE admin_id = rc.user_id)
                   END as user_name,
                   DATE_FORMAT(rc.created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_at
            FROM report_comment rc
            WHERE rc.report_id = ?
            ORDER BY rc.created_at
        `, [reportId]);
        
        return comments;
    } catch (err) {
        console.error('Error fetching report comments:', err);
        throw err;
    }
}

/**
 * Add a comment to a report
 * @param {Object} commentData - The comment data
 */
async function addReportComment(commentData) {
    try {
        const { reportId, userId, userType, comment } = commentData;
        
        await db.query(
            `INSERT INTO report_comment (report_id, user_id, user_type, comment)
             VALUES (?, ?, ?, ?)`,
            [reportId, userId, userType, comment]
        );
        
        return true;
    } catch (err) {
        console.error('Error adding comment:', err);
        throw err;
    }
}

/**
 * Update a report's status
 * @param {number} reportId - The report ID
 * @param {Object} updateData - The update data
 */
async function updateReportStatus(reportId, updateData) {
    try {
        const { status, adminNotes, resolution } = updateData;
        
        await db.query(
            `UPDATE driver_report 
             SET status = ?, 
                 admin_notes = ?, 
                 resolution_details = ?
             WHERE report_id = ?`,
            [status, adminNotes, resolution, reportId]
        );
        
        return true;
    } catch (err) {
        console.error('Error updating report status:', err);
        throw err;
    }
}

/**
 * Get all report categories
 */
async function getReportCategories() {
    try {
        const [categories] = await db.query("SELECT * FROM report_category WHERE is_active = TRUE");
        return categories;
    } catch (err) {
        console.error('Error fetching report categories:', err);
        throw err;
    }
}

/**
 * Get report evidence files
 * @param {number} reportId - The report ID
 */
async function getReportEvidence(reportId) {
    try {
        const [evidence] = await db.query(`
            SELECT * FROM report_evidence
            WHERE report_id = ?
        `, [reportId]);
        
        return evidence;
    } catch (err) {
        console.error('Error fetching report evidence:', err);
        throw err;
    }
}

module.exports = {
    ensureReportTablesExist,
    getAllReports,
    getPassengerReports,
    getDriverReports,
    getReportById,
    createReport,
    addReportEvidence,
    getReportComments,
    addReportComment,
    updateReportStatus,
    getReportCategories,
    getReportEvidence
};