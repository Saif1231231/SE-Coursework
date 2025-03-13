const express = require("express");
const router = express.Router();
const db = require("../services/db");

// Show Available Rides
router.get("/", async (req, res) => {
    try {
        const rides = await db.query(`
            SELECT r.*, d.name as driver_name, d.vehicle_details
            FROM ride r
            LEFT JOIN driver d ON r.driver_id = d.driver_id
            ORDER BY r.departureTime
        `);
        res.render("rides/rides", { rides });
    } catch (err) {
        console.error("Error fetching rides:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Show Create Ride Form
router.get("/create", async (req, res) => {
    try {
        const drivers = await db.query("SELECT driver_id, name, vehicle_details FROM driver");
        res.render("rides/createRide", { drivers });
    } catch (err) {
        console.error("Error fetching drivers:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Handle Create Ride Form Submission
router.post("/create", async (req, res) => {
    try {
        const { driverID, pickupLocation, destination, departureTime, seatsAvailable, price } = req.body;
        
        await db.query(
            `INSERT INTO ride (driver_id, pickup_location, dropoff_location, 
                             departureTime, seatsAvailable, fare, status) 
             VALUES (?, ?, ?, ?, ?, ?, 'requested')`,
            [driverID, pickupLocation, destination, 
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
            `SELECT r.*, d.name as driver_name, d.vehicle_details
             FROM ride r
             LEFT JOIN driver d ON r.driver_id = d.driver_id
             WHERE r.ride_id = ?`, 
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

