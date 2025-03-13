const express = require("express");
const router = express.Router();
const db = require("../services/db");

// Show Reviews Page
router.get("/", async (req, res) => {
    try {
        const [reviews, rides, passengers, drivers] = await Promise.all([
            db.query(`
                SELECT r.*, 
                       p.name as passenger_name,
                       d.name as driver_name,
                       rd.pickup_location,
                       rd.dropoff_location
                FROM review r
                LEFT JOIN passenger p ON r.passenger_id = p.passenger_id
                LEFT JOIN driver d ON r.driver_id = d.driver_id
                LEFT JOIN ride rd ON r.ride_id = rd.ride_id
                ORDER BY r.created_at DESC
            `),
            db.query("SELECT ride_id, pickup_location, dropoff_location FROM ride"),
            db.query("SELECT passenger_id, name FROM passenger"),
            db.query("SELECT driver_id, name FROM driver")
        ]);

        res.render("reviews/reviews", { 
            reviews,
            rides,
            passengers,
            drivers
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
        
        await db.query(
            `INSERT INTO review (ride_id, passenger_id, driver_id, rating, comment) 
             VALUES (?, ?, ?, ?, ?)`,
            [rideId, passengerId, driverId, rating, review]
        );
        
        res.redirect("/reviews");
    } catch (err) {
        console.error("Error creating review:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

module.exports = router;
