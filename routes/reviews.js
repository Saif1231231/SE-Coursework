const express = require("express");
const router = express.Router();
const db = require("../services/db");

// Show Reviews Page
router.get("/", async (req, res) => {
    try {
        // Get all reviews with related data
        const [reviewsResult] = await db.query(`
            SELECT r.*, 
                   p.name as passenger_name,
                   d.name as driver_name,
                   rd.pickup_location,
                   rd.dropoff_location,
                   DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_at
            FROM review r
            LEFT JOIN passenger p ON r.passenger_id = p.passenger_id
            LEFT JOIN driver d ON r.driver_id = d.driver_id
            LEFT JOIN ride rd ON r.ride_id = rd.ride_id
            ORDER BY r.created_at DESC
        `);

        // Get rides, passengers, and drivers for the form
        const [ridesResult] = await db.query(`
            SELECT 
                ride_id, 
                pickup_location, 
                dropoff_location, 
                DATE_FORMAT(departureTime, '%Y-%m-%d %H:%i:%s') as departureTime 
            FROM ride 
            WHERE status = 'completed'
        `);
        const [passengersResult] = await db.query("SELECT passenger_id, name FROM passenger");
        const [driversResult] = await db.query("SELECT driver_id, name FROM driver");

        // Format the reviews data
        const reviews = reviewsResult.map(review => {
            return {
                ...review,
                // Use the formatted date from MySQL
                created_at: review.formatted_created_at || review.created_at
            };
        });

        res.render("reviews/reviews", { 
            reviews,
            rides: ridesResult,
            passengers: passengersResult,
            drivers: driversResult
        });
    } catch (err) {
        console.error("Error fetching reviews:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Handle Review Creation
router.post("/create", async (req, res) => {
    try {
        const { rating, review, rideId, passengerId, driverId } = req.body;
        
        // Validate input
        if (!rating || !rideId || !passengerId || !driverId) {
            return res.status(400).send("All fields are required except comment");
        }

        // Check if a review already exists for this combination
        const [existingReviews] = await db.query(
            `SELECT * FROM review 
             WHERE ride_id = ? AND passenger_id = ? AND driver_id = ?`,
            [rideId, passengerId, driverId]
        );

        if (existingReviews && existingReviews.length > 0) {
            // Update existing review
            await db.query(
                `UPDATE review SET rating = ?, comment = ?, created_at = NOW() 
                 WHERE ride_id = ? AND passenger_id = ? AND driver_id = ?`,
                [rating, review || null, rideId, passengerId, driverId]
            );
        } else {
            // Insert new review
            await db.query(
                `INSERT INTO review (ride_id, passenger_id, driver_id, rating, comment, created_at) 
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [rideId, passengerId, driverId, rating, review || null]
            );
        }
        
        res.redirect("/reviews");
    } catch (err) {
        console.error("Error creating review:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

module.exports = router;
