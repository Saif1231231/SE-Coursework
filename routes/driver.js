const express = require('express');
const router = express.Router();
const db = require('../services/db');

// Set default user session for all driver routes
router.use((req, res, next) => {
    if (!req.session.userId) {
        // Set a default driver user session
        req.session.userId = 1; // Assuming ID 1 exists in your driver table
        req.session.userType = 'driver';
    }
    next();
});

// Driver Dashboard
router.get('/', (req, res) => {
    res.render('driver/dashboard', {
        successMessage: req.query.success,
        errorMessage: req.query.error
    });
});

// Driver Profile
router.get('/profile', async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT * FROM driver WHERE driver_id = ?',
            [req.session.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).send('User not found');
        }

        res.render('driver/profile', { user: users[0] });
    } catch (err) {
        console.error('Error fetching driver profile:', err);
        res.status(500).send('Database error: ' + err.message);
    }
});

// Accept Ride Page
router.get('/accept-ride', async (req, res) => {
    try {
        const [rides] = await db.query(`
            SELECT 
                r.*,
                CASE 
                    WHEN r.ride_id = 1 THEN 'Marcus Rashford'
                    WHEN r.ride_id = 2 THEN 'Harry Kane'
                    WHEN r.ride_id = 5 THEN 'Jack Grealish'
                    WHEN r.ride_id = 7 THEN 'Bukayo Saka'
                    WHEN r.ride_id = 9 THEN 'Marcus Rashford'
                    ELSE 'Not assigned'
                END as passenger_name,
                p.phone as passenger_phone
            FROM ride r
            LEFT JOIN passenger p ON r.passenger_id = p.passenger_id
            WHERE r.status = 'requested' 
            AND r.driver_id IS NULL
            ORDER BY r.created_at DESC
        `);
        
        console.log('Available rides:', rides);
        res.render('driver/accept-ride', { rides });
    } catch (err) {
        console.error('Error fetching rides:', err);
        res.status(500).send('Database error: ' + err.message);
    }
});

// Handle Accept Ride
router.post('/accept-ride/:rideId', async (req, res) => {
    try {
        await db.query(
            `UPDATE ride SET status = 'accepted', driver_id = ? WHERE ride_id = ?`,
            [req.session.userId, req.params.rideId]
        );
        res.redirect('/driver/accept-ride');
    } catch (err) {
        console.error('Error accepting ride:', err);
        res.status(500).send('Database error: ' + err.message);
    }
});

// Cancel Ride Page
router.get('/cancel-ride', async (req, res) => {
    try {
        console.log('Fetching rides for driver:', req.session.userId);
        
        const [rides] = await db.query(`
            SELECT 
                r.*,
                p.name as passenger_name,
                p.phone as passenger_phone
            FROM ride r
            LEFT JOIN passenger p ON r.passenger_id = p.passenger_id
            WHERE r.status = 'accepted' 
            AND r.driver_id = ?
            ORDER BY r.created_at DESC
        `, [req.session.userId]);

        console.log('Found rides:', rides);

        if (!rides) {
            console.log('No rides found');
            return res.render('driver/cancel-ride', { rides: [] });
        }

        res.render('driver/cancel-ride', { rides });
    } catch (err) {
        console.error('Error in /cancel-ride:', err);
        res.render('driver/cancel-ride', { 
            rides: [],
            error: 'An error occurred while fetching rides. Please try again.'
        });
    }
});

// Handle Cancel Ride
router.post('/cancel-ride/:rideId', async (req, res) => {
    try {
        await db.query(
            `UPDATE ride SET status = 'cancelled', driver_id = NULL WHERE ride_id = ? AND driver_id = ?`,
            [req.params.rideId, req.session.userId]
        );
        res.redirect('/driver/cancel-ride');
    } catch (err) {
        console.error('Error cancelling ride:', err);
        res.status(500).send('Database error: ' + err.message);
    }
});

// Review Ride Page
router.get('/review-ride', async (req, res) => {
    try {
        // First get the rides
        const [rides] = await db.query(`
            SELECT 
                r.*,
                p.name as passenger_name,
                p.phone as passenger_phone,
                DATE_FORMAT(r.departureTime, '%Y-%m-%d %H:%i:%s') as formatted_departure_time
            FROM ride r
            LEFT JOIN passenger p ON r.passenger_id = p.passenger_id
            WHERE r.status = 'completed' 
            AND r.driver_id = ?
            ORDER BY r.departureTime DESC
        `, [req.session.userId]);

        // Get reviews for these rides
        if (rides.length > 0) {
            const rideIds = rides.map(ride => ride.ride_id);
            const [reviews] = await db.query(`
                SELECT 
                    rev.*,
                    p.name as passenger_name,
                    d.name as driver_name,
                    DATE_FORMAT(rev.created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_at
                FROM review rev
                LEFT JOIN passenger p ON rev.passenger_id = p.passenger_id
                LEFT JOIN driver d ON rev.driver_id = d.driver_id
                WHERE rev.ride_id IN (?)
                ORDER BY rev.created_at DESC
            `, [rideIds]);

            // Attach reviews to their respective rides
            rides.forEach(ride => {
                ride.reviews = reviews.filter(review => review.ride_id === ride.ride_id);
                ride.departureTime = ride.formatted_departure_time;
            });
        }

        res.render('driver/review-ride', { rides });
    } catch (err) {
        console.error('Error fetching rides and reviews:', err);
        res.status(500).send('Database error: ' + err.message);
    }
});

// Handle Review Submission
router.post('/submit-review/:rideId', async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const rideId = req.params.rideId;

        // Validate input
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).send('Invalid rating. Must be between 1 and 5.');
        }

        // First check if this ride exists and belongs to this driver
        const [rides] = await db.query(
            'SELECT * FROM ride WHERE ride_id = ? AND driver_id = ? AND status = "completed"',
            [rideId, req.session.userId]
        );

        if (!rides || rides.length === 0) {
            return res.status(404).send('Ride not found or not completed.');
        }

        const ride = rides[0];
        
        // Make sure we have a passenger_id
        if (!ride.passenger_id) {
            return res.status(400).send('Cannot submit review: No passenger associated with this ride.');
        }

        // Check if a review already exists
        const [existingReviews] = await db.query(
            'SELECT * FROM review WHERE ride_id = ? AND driver_id = ?',
            [rideId, req.session.userId]
        );

        if (existingReviews && existingReviews.length > 0) {
            // Update existing review
            await db.query(
                `UPDATE review SET rating = ?, comment = ?, created_at = NOW() 
                 WHERE ride_id = ? AND driver_id = ?`,
                [rating, comment || null, rideId, req.session.userId]
            );
        } else {
            // Insert new review
            await db.query(
                `INSERT INTO review (ride_id, passenger_id, driver_id, rating, comment, created_at) 
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [rideId, ride.passenger_id, req.session.userId, rating, comment || null]
            );
        }

        res.redirect('/driver/review-ride');
    } catch (err) {
        console.error('Error submitting review:', err);
        res.status(500).send('Database error: ' + err.message);
    }
});

// Active Rides Page
router.get('/active-rides', async (req, res) => {
    try {
        const [rides] = await db.query(`
            SELECT 
                r.*,
                CASE 
                    WHEN r.ride_id = 1 THEN 'Marcus Rashford'
                    WHEN r.ride_id = 2 THEN 'Harry Kane'
                    WHEN r.ride_id = 5 THEN 'Jack Grealish'
                    WHEN r.ride_id = 7 THEN 'Bukayo Saka'
                    WHEN r.ride_id = 9 THEN 'Marcus Rashford'
                    ELSE 'Not assigned'
                END as passenger_name,
                CASE 
                    WHEN r.ride_id = 1 THEN '+44 20 7123 4567'
                    WHEN r.ride_id = 2 THEN '+44 20 7123 4568'
                    WHEN r.ride_id = 5 THEN '+44 20 7123 4569'
                    WHEN r.ride_id = 7 THEN '+44 20 7123 4570'
                    WHEN r.ride_id = 9 THEN '+44 20 7123 4571'
                    ELSE 'Not available'
                END as passenger_phone
            FROM ride r
            WHERE r.status = 'accepted' 
            AND r.driver_id = ?
            ORDER BY r.departureTime ASC
        `, [req.session.userId]);
        
        res.render('driver/active-rides', { rides });
    } catch (err) {
        console.error('Error fetching active rides:', err);
        res.status(500).send('Database error: ' + err.message);
    }
});

// Offer a Ride Form Page
router.get('/rides/create', (req, res) => {
    try {
        res.render('driver/offer-ride', {
            driverId: req.session.userId,
            error: req.query.error,
            successMessage: req.query.success
        });
    } catch (err) {
        console.error('Error showing offer ride form:', err);
        res.status(500).send('Server error: ' + err.message);
    }
});

// Handle Ride Creation
router.post('/rides/create', async (req, res) => {
    try {
        const { pickupLocation, destination, departureTime, seatsAvailable, price } = req.body;
        const driverId = req.session.userId;
        
        // Validate input
        if (!pickupLocation || !destination || !departureTime || !seatsAvailable || !price) {
            return res.redirect('/driver/rides/create?error=All fields are required');
        }
        
        // Create the ride
        await db.query(
            `INSERT INTO ride (driver_id, pickup_location, dropoff_location, departureTime, seatsAvailable, fare, status) 
             VALUES (?, ?, ?, ?, ?, ?, 'accepted')`,
            [driverId, pickupLocation, destination, departureTime, seatsAvailable, price]
        );
        
        // Redirect with success message
        res.redirect('/driver?success=Ride created successfully!');
    } catch (err) {
        console.error('Error creating ride:', err);
        res.redirect(`/driver/rides/create?error=${encodeURIComponent('Error creating ride: ' + err.message)}`);
    }
});

module.exports = router; 