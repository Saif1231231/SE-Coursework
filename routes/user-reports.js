const express = require("express");
const router = express.Router();
const db = require("../services/db");

// Show user reports list
router.get("/", async (req, res) => {
    try {
        // Check if user is admin
        if (!req.session.userType || req.session.userType !== 'admin') {
            return res.redirect('/auth/login');
        }
        
        // Get filter parameters
        const status = req.query.status || 'all';
        const type = req.query.type || 'all';
        
        // Build query based on filters
        let query = `
            SELECT r.*,
                   CASE 
                       WHEN r.reporter_type = 'passenger' THEN rp.name
                       WHEN r.reporter_type = 'driver' THEN rd.name
                       WHEN r.reporter_type = 'admin' THEN a.name
                   END as reporter_name,
                   CASE 
                       WHEN r.reported_type = 'passenger' THEN tp.name
                       WHEN r.reported_type = 'driver' THEN td.name
                   END as reported_name,
                   DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_at,
                   DATE_FORMAT(r.resolved_at, '%Y-%m-%d %H:%i:%s') as formatted_resolved_at
            FROM user_report r
            LEFT JOIN passenger rp ON r.reporter_id = rp.passenger_id AND r.reporter_type = 'passenger'
            LEFT JOIN driver rd ON r.reporter_id = rd.driver_id AND r.reporter_type = 'driver'
            LEFT JOIN admin a ON r.reporter_id = a.admin_id AND r.reporter_type = 'admin'
            LEFT JOIN passenger tp ON r.reported_id = tp.passenger_id AND r.reported_type = 'passenger'
            LEFT JOIN driver td ON r.reported_id = td.driver_id AND r.reported_type = 'driver'
            WHERE 1=1
        `;
        
        // Apply filters
        if (status !== 'all') {
            query += ` AND r.status = '${status}'`;
        }
        
        if (type !== 'all') {
            query += ` AND r.reported_type = '${type}'`;
        }
        
        // Add sorting
        query += ` ORDER BY 
                  CASE 
                      WHEN r.status = 'pending' THEN 1
                      WHEN r.status = 'investigating' THEN 2
                      ELSE 3
                  END,
                  r.created_at DESC`;
        
        // Execute query
        const [reportsResult] = await db.query(query);
        
        // Format report dates
        const reports = reportsResult.map(report => {
            return {
                ...report,
                created_at: report.formatted_created_at || report.created_at,
                resolved_at: report.formatted_resolved_at || report.resolved_at
            };
        });
        
        res.render("reports/user-reports", { 
            reports,
            filters: {
                status,
                type
            },
            user: {
                id: req.session.userId,
                type: req.session.userType
            }
        });
    } catch (err) {
        console.error("Error fetching user reports:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Get report details
router.get("/:id", async (req, res) => {
    try {
        // Check if user is admin
        if (!req.session.userType || req.session.userType !== 'admin') {
            return res.redirect('/auth/login');
        }
        
        const reportId = req.params.id;
        
        // Get report details
        const [reportResults] = await db.query(
            `SELECT r.*,
                   CASE 
                       WHEN r.reporter_type = 'passenger' THEN rp.name
                       WHEN r.reporter_type = 'driver' THEN rd.name
                       WHEN r.reporter_type = 'admin' THEN a.name
                   END as reporter_name,
                   CASE 
                       WHEN r.reported_type = 'passenger' THEN tp.name
                       WHEN r.reported_type = 'driver' THEN td.name
                   END as reported_name,
                   CASE 
                       WHEN r.reporter_type = 'passenger' THEN rp.email
                       WHEN r.reporter_type = 'driver' THEN rd.email
                       WHEN r.reporter_type = 'admin' THEN a.email
                   END as reporter_email,
                   CASE 
                       WHEN r.reported_type = 'passenger' THEN tp.email
                       WHEN r.reported_type = 'driver' THEN td.email
                   END as reported_email,
                   DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_at,
                   DATE_FORMAT(r.resolved_at, '%Y-%m-%d %H:%i:%s') as formatted_resolved_at
            FROM user_report r
            LEFT JOIN passenger rp ON r.reporter_id = rp.passenger_id AND r.reporter_type = 'passenger'
            LEFT JOIN driver rd ON r.reporter_id = rd.driver_id AND r.reporter_type = 'driver'
            LEFT JOIN admin a ON r.reporter_id = a.admin_id AND r.reporter_type = 'admin'
            LEFT JOIN passenger tp ON r.reported_id = tp.passenger_id AND r.reported_type = 'passenger'
            LEFT JOIN driver td ON r.reported_id = td.driver_id AND r.reported_type = 'driver'
            WHERE r.report_id = ?`,
            [reportId]
        );
        
        if (!reportResults || reportResults.length === 0) {
            return res.status(404).send("Report not found");
        }
        
        // Format report object
        const report = {
            ...reportResults[0],
            created_at: reportResults[0].formatted_created_at || reportResults[0].created_at,
            resolved_at: reportResults[0].formatted_resolved_at || reportResults[0].resolved_at
        };
        
        // Get other reports about the same user
        const [otherReportsResult] = await db.query(
            `SELECT r.*,
                   CASE 
                       WHEN r.reporter_type = 'passenger' THEN rp.name
                       WHEN r.reporter_type = 'driver' THEN rd.name
                       WHEN r.reporter_type = 'admin' THEN a.name
                   END as reporter_name,
                   DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_at
            FROM user_report r
            LEFT JOIN passenger rp ON r.reporter_id = rp.passenger_id AND r.reporter_type = 'passenger'
            LEFT JOIN driver rd ON r.reporter_id = rd.driver_id AND r.reporter_type = 'driver'
            LEFT JOIN admin a ON r.reporter_id = a.admin_id AND r.reporter_type = 'admin'
            WHERE r.reported_id = ? AND r.reported_type = ? AND r.report_id != ?
            ORDER BY r.created_at DESC`,
            [report.reported_id, report.reported_type, reportId]
        );
        
        // Format other reports
        const otherReports = otherReportsResult.map(r => {
            return {
                ...r,
                created_at: r.formatted_created_at || r.created_at
            };
        });
        
        res.render("reports/user-report-detail", {
            report,
            otherReports,
            user: {
                id: req.session.userId,
                type: req.session.userType
            }
        });
    } catch (err) {
        console.error("Error fetching report details:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Submit a new user report
router.post("/create", async (req, res) => {
    try {
        const { reporterId, reporterType, reportedId, reportedType, reason, description } = req.body;
        
        // Validate input
        if (!reporterId || !reporterType || !reportedId || !reportedType || !reason) {
            return res.status(400).send("All required fields must be provided");
        }
        
        // Create report
        await db.query(
            `INSERT INTO user_report 
             (reporter_id, reporter_type, reported_id, reported_type, reason, description, status) 
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [reporterId, reporterType, reportedId, reportedType, reason, description || null]
        );
        
        // Redirect based on user type
        if (reporterType === 'admin') {
            res.redirect("/user-reports");
        } else {
            res.redirect("/profile");
        }
    } catch (err) {
        console.error("Error creating user report:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Update report status
router.post("/update-status", async (req, res) => {
    try {
        // Check if user is admin
        if (!req.session.userType || req.session.userType !== 'admin') {
            return res.redirect('/auth/login');
        }
        
        const { reportId, status, resolutionNotes } = req.body;
        
        // Update report status
        if (status === 'resolved' || status === 'dismissed') {
            // If resolving or dismissing, add resolution date
            await db.query(
                `UPDATE user_report 
                 SET status = ?, resolution_notes = ?, resolved_at = NOW() 
                 WHERE report_id = ?`,
                [status, resolutionNotes || null, reportId]
            );
        } else {
            // Otherwise just update status
            await db.query(
                `UPDATE user_report 
                 SET status = ?, resolution_notes = ? 
                 WHERE report_id = ?`,
                [status, resolutionNotes || null, reportId]
            );
        }
        
        res.redirect(`/user-reports/${reportId}`);
    } catch (err) {
        console.error("Error updating report status:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Take action on reported user
router.post("/take-action", async (req, res) => {
    try {
        // Check if user is admin
        if (!req.session.userType || req.session.userType !== 'admin') {
            return res.redirect('/auth/login');
        }
        
        const { reportId, action, userId, userType } = req.body;
        
        if (action === 'suspend') {
            // Suspend user
            if (userType === 'passenger') {
                await db.query(
                    `UPDATE passenger SET suspended = TRUE WHERE passenger_id = ?`,
                    [userId]
                );
            } else if (userType === 'driver') {
                await db.query(
                    `UPDATE driver SET suspended = TRUE WHERE driver_id = ?`,
                    [userId]
                );
            }
            
            // Update all pending reports for this user to resolved
            await db.query(
                `UPDATE user_report 
                 SET status = 'resolved', resolution_notes = 'User suspended', resolved_at = NOW() 
                 WHERE reported_id = ? AND reported_type = ? AND status IN ('pending', 'investigating')`,
                [userId, userType]
            );
        } else if (action === 'unsuspend') {
            // Unsuspend user
            if (userType === 'passenger') {
                await db.query(
                    `UPDATE passenger SET suspended = FALSE WHERE passenger_id = ?`,
                    [userId]
                );
            } else if (userType === 'driver') {
                await db.query(
                    `UPDATE driver SET suspended = FALSE WHERE driver_id = ?`,
                    [userId]
                );
            }
        }
        
        res.redirect(`/user-reports/${reportId}`);
    } catch (err) {
        console.error("Error taking action on user:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

module.exports = router; 