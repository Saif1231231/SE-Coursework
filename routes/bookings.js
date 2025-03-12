const express = require('express');
const router = express.Router();
const db = require("../services/db");

// Show bookings list
router.get('/', async (req, res) => {
    try {
        const bookings = await db.query("SELECT * FROM booking");
        res.render("bookings/bookings", { bookings });
    } catch (err) {
        console.error("Error fetching bookings:", err);
        res.status(500).send("Database error.");
    }
});

// Handle booking creation
router.get('/book/:rideID', async (req, res) => {
    try {
        // Add your booking logic here
        // For now, just redirect to success page
        res.render("bookingSuccess");
    } catch (err) {
        console.error("Error creating booking:", err);
        res.status(500).send("Database error.");
    }
});

module.exports = router;

