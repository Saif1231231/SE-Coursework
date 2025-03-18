const express = require('express');
const router = express.Router();
const db = require('../services/db');

// Set default user session for all student routes
router.use((req, res, next) => {
    if (!req.session.userId) {
        // Set a default student user session
        req.session.userId = 1; // Assuming ID 1 exists in your passenger table
        req.session.userType = 'passenger';
    }
    next();
});

// Student Dashboard
router.get('/', (req, res) => {
    res.render('student/dashboard');
});

// Transport Page
router.get('/transport', async (req, res) => {
    try {
        const [rides] = await db.query(`
            SELECT 
                r.ride_id,
                r.pickup_location,
                r.dropoff_location,
                r.departureTime,
                r.seatsAvailable,
                r.fare,
                r.status,
                d.name as driver_name
            FROM ride r
            LEFT JOIN driver d ON r.driver_id = d.driver_id
            WHERE r.seatsAvailable > 0 
            AND r.status = 'accepted'
            ORDER BY r.departureTime
        `);
        res.render('student/transport', { rides });
    } catch (err) {
        console.error('Error fetching rides:', err);
        res.status(500).send('Database error: ' + err.message);
    }
});

// Search Rides
router.post('/transport/search', async (req, res) => {
    try {
        const { whereFrom, whereTo } = req.body;
        const [rides] = await db.query(`
            SELECT 
                r.ride_id,
                r.pickup_location,
                r.dropoff_location,
                r.departureTime,
                r.seatsAvailable,
                r.fare,
                r.status,
                d.name as driver_name
            FROM ride r
            LEFT JOIN driver d ON r.driver_id = d.driver_id
            WHERE r.seatsAvailable > 0 
            AND r.status = 'accepted'
            AND (r.pickup_location LIKE ? OR ? = '')
            AND (r.dropoff_location LIKE ? OR ? = '')
            ORDER BY r.departureTime
        `, [`%${whereFrom}%`, whereFrom, `%${whereTo}%`, whereTo]);
        
        res.render('student/transport', { rides, searchQuery: { whereFrom, whereTo } });
    } catch (err) {
        console.error('Error searching rides:', err);
        res.status(500).send('Database error: ' + err.message);
    }
});

// Profile Page
router.get('/profile', async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT * FROM passenger WHERE passenger_id = ?',
            [req.session.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).send('User not found');
        }

        res.render('student/profile', { user: users[0] });
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).send('Database error: ' + err.message);
    }
});

// Bookings Page
router.get('/bookings', async (req, res) => {
    try {
        const [bookings] = await db.query(`
            SELECT 
                b.*,
                r.pickup_location,
                r.dropoff_location,
                r.departureTime,
                r.fare,
                d.name as driver_name
            FROM booking b
            JOIN ride r ON b.ride_id = r.ride_id
            LEFT JOIN driver d ON r.driver_id = d.driver_id
            WHERE b.passenger_id = ?
            ORDER BY r.departureTime DESC
        `, [req.session.userId]);
        
        res.render('student/bookings', { bookings });
    } catch (err) {
        console.error('Error fetching bookings:', err);
        res.status(500).send('Database error: ' + err.message);
    }
});

// Cancel Booking
router.post('/bookings/:bookingId/cancel', async (req, res) => {
    try {
        await db.query(
            'UPDATE booking SET booking_status = "cancelled" WHERE booking_id = ? AND passenger_id = ?',
            [req.params.bookingId, req.session.userId]
        );
        res.redirect('/student/bookings');
    } catch (err) {
        console.error('Error cancelling booking:', err);
        res.status(500).send('Database error: ' + err.message);
    }
});

module.exports = router; 