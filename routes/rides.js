const express = require("express");
const router = express.Router();
const db = require("../services/db");

// Show Available Rides
router.get("/", async (req, res) => {
    try {
        const rides = await db.query(`
            SELECT * FROM ride 
            WHERE seatsAvailable > 0 
            ORDER BY departureTime
        `);
        res.render("rides/rides", { rides });
    } catch (err) {
        console.error("Error fetching rides:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Show Create Ride Form
router.get("/create", (req, res) => {
    res.render("rides/createRide");
});

// Handle Create Ride Form Submission
router.post("/create", async (req, res) => {
    try {
        const { pickupLocation, destination, departureTime, seatsAvailable, price } = req.body;
        const rideId = 'RIDE' + Date.now();
        const driverId = 'DRV1'; // placeholder driver ID

        await db.query(
            `INSERT INTO ride (rideId, driverId, pickupLocation, destination, 
                             departureTime, seatsAvailable, price) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [rideId, driverId, pickupLocation, destination, 
             departureTime, seatsAvailable, price]
        );
        res.redirect("/rides");
    } catch (err) {
        console.error("Error creating ride:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Show Single Ride Details
router.get("/:rideId", async (req, res) => {
    try {
        const [ride] = await db.query(
            "SELECT * FROM ride WHERE rideId = ?", 
            [req.params.rideId]
        );
        
        if (!ride) {
            return res.status(404).render("404");
        }
        
        res.render("rides/rideDetails", { ride });
    } catch (err) {
        console.error("Error fetching ride details:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

module.exports = router;

