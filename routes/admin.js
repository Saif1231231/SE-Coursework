const express = require('express');
const router = express.Router();
const db = require('../services/db');

// Set default user session for all admin routes
router.use((req, res, next) => {
    if (!req.session.userId) {
        // Set a default admin user session
        req.session.userId = 1; // Assuming ID 1 exists in your admin table
        req.session.userType = 'admin';
    }
    next();
});

// Admin Dashboard
router.get('/', (req, res) => {
    res.render('admin/dashboard');
});

// Verify User Page (Users List)
router.get('/verify-user', async (req, res) => {
    try {
        // Get all users (both passengers and drivers)
        const [passengers] = await db.query(`
            SELECT passenger_id as user_id, name, email, phone, 'passenger' as type, created_at 
            FROM passenger
        `);
        
        const [drivers] = await db.query(`
            SELECT driver_id as user_id, name, email, phone, 'driver' as type, 
                   license_number, vehicle_details, created_at 
            FROM driver
        `);

        res.render('admin/verify-user', { 
            users: [...passengers, ...drivers],
            message: req.query.message
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.render('admin/verify-user', { 
            users: [], 
            message: 'Error fetching users: ' + err.message 
        });
    }
});

// Handle User Verification
router.post('/verify-user/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        const table = type === 'driver' ? 'driver' : 'passenger';
        const idField = type === 'driver' ? 'driver_id' : 'passenger_id';

        await db.query(
            `UPDATE ${table} SET verified = 1 WHERE ${idField} = ?`,
            [id]
        );

        res.redirect('/admin/verify-user?message=User verified successfully');
    } catch (err) {
        console.error('Error verifying user:', err);
        res.redirect('/admin/verify-user?message=Error verifying user: ' + err.message);
    }
});

// Suspend User Page
router.get('/suspend', async (req, res) => {
    try {
        const [passengers] = await db.query(`
            SELECT passenger_id as user_id, name, email, phone, 'passenger' as type,
                   suspended, created_at 
            FROM passenger
        `);
        
        const [drivers] = await db.query(`
            SELECT driver_id as user_id, name, email, phone, 'driver' as type,
                   suspended, license_number, vehicle_details, created_at 
            FROM driver
        `);

        res.render('admin/suspend', { 
            users: [...passengers, ...drivers],
            message: req.query.message
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.render('admin/suspend', { 
            users: [],
            message: 'Error fetching users: ' + err.message
        });
    }
});

// Handle User Suspension
router.post('/suspend/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        const { action } = req.body; // 'suspend' or 'unsuspend'
        const table = type === 'driver' ? 'driver' : 'passenger';
        const idField = type === 'driver' ? 'driver_id' : 'passenger_id';

        await db.query(
            `UPDATE ${table} SET suspended = ? WHERE ${idField} = ?`,
            [action === 'suspend' ? 1 : 0, id]
        );

        res.redirect('/admin/suspend?message=User ' + action + 'ed successfully');
    } catch (err) {
        console.error('Error updating user suspension:', err);
        res.redirect('/admin/suspend?message=Error updating user: ' + err.message);
    }
});

// Resolve Disputes Page
router.get('/resolve', async (req, res) => {
    try {
        const [disputes] = await db.query(`
            SELECT 
                d.dispute_id,
                d.description,
                d.status,
                d.created_at,
                r.ride_id,
                r.pickup_location,
                r.dropoff_location,
                p.name as passenger_name,
                dr.name as driver_name
            FROM dispute d
            JOIN ride r ON d.ride_id = r.ride_id
            JOIN passenger p ON d.passenger_id = p.passenger_id
            JOIN driver dr ON d.driver_id = dr.driver_id
            WHERE d.status = 'pending'
            ORDER BY d.created_at DESC
        `);

        res.render('admin/resolve', { 
            disputes,
            message: req.query.message
        });
    } catch (err) {
        console.error('Error fetching disputes:', err);
        res.render('admin/resolve', { 
            disputes: [],
            message: 'Error fetching disputes: ' + err.message
        });
    }
});

// Handle Dispute Resolution
router.post('/resolve-dispute/:id', async (req, res) => {
    try {
        const { resolution } = req.body;
        await db.query(
            'UPDATE dispute SET status = "resolved", resolution = ? WHERE dispute_id = ?',
            [resolution, req.params.id]
        );
        res.redirect('/admin/resolve?message=Dispute resolved successfully');
    } catch (err) {
        console.error('Error resolving dispute:', err);
        res.redirect('/admin/resolve?message=Error resolving dispute: ' + err.message);
    }
});

module.exports = router; 