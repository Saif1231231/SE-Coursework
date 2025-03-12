const express = require("express");
const router = express.Router();
const db = require("../services/db");

// Show Reviews Page
router.get("/", async (req, res) => {
    try {
        // Simplified query to just get basic review information
        const reviews = await db.query(`
            SELECT reviewId, rating, review, timestamp 
            FROM review 
            ORDER BY timestamp DESC
        `);
        res.render("reviews/reviews", { reviews });
    } catch (err) {
        console.error("Error fetching reviews:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Handle Review Creation
router.post("/create", async (req, res) => {
    try {
        const { rating, review } = req.body;
        
        // For testing purposes, use placeholder values
        const reviewId = 'REV' + Date.now();
        const bookingId = 'BOOK1'; // placeholder
        const passengerId = 'PASS1'; // placeholder
        const rideId = 'RIDE1'; // placeholder

        await db.query(
            `INSERT INTO review (reviewId, bookingId, passengerId, rideId, rating, review) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [reviewId, bookingId, passengerId, rideId, rating, review]
        );
        
        res.redirect("/reviews");
    } catch (err) {
        console.error("Error creating review:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

module.exports = router;
