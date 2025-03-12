const express = require("express");
const router = express.Router();
const db = require("../services/db");

// ✅ Show Available Rides
router.get("/", async (req, res) => {
    try {
        const rides = await db.query("SELECT * FROM ride WHERE seatsAvailable > 0");
        res.render("rides/rides", { rides });
    } catch (err) {
        console.error("Error fetching rides:", err);
        res.status(500).send("Database error.");
    }
});

// ✅ Show "Create Ride" Page
router.get("/create", (req, res) => {
    res.render("rides/createRide");
});

// ✅ Handle "Create Ride" Form Submission
router.post("/create", async (req, res) => {
    const { driverID, pickupLocation, destination, departureTime, seatsAvailable, price } = req.body;
    
    if (!driverID || !pickupLocation || !destination || !departureTime || !seatsAvailable || !price) {
        return res.status(400).send("All fields are required.");
    }

    try {
        await db.query(
            "INSERT INTO ride (driverID, pickupLocation, destination, departureTime, seatsAvailable, price) VALUES (?, ?, ?, ?, ?, ?)",
            [driverID, pickupLocation, destination, departureTime, seatsAvailable, price]
        );
        res.redirect("/rides");
    } catch (err) {
        console.error("Error creating ride:", err);
        res.status(500).send("Database error.");
    }
});

module.exports = router;

