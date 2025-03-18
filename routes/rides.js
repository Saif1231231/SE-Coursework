const express = require("express");
const router = express.Router();
const db = require("../services/db");

// Show Available Rides
router.get("/", async (req, res) => {
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
            WHERE r.status IN ('requested', 'accepted', 'pending')
            ORDER BY r.departureTime ASC
        `);

        // Simple formatting for display
        const formattedRides = rides.map(ride => ({
            ...ride,
            fare: parseFloat(ride.fare).toFixed(2)
        }));

        res.render("rides/rides", { rides: formattedRides });
    } catch (err) {
        console.error("Error fetching rides:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Add Sample UK Rides
router.get("/add-sample-rides", async (req, res) => {
    try {
        const sampleRides = [
            {
                pickup: "London",
                dropoff: "Manchester",
                fare: 45.00,
                seats: 4
            },
            {
                pickup: "Birmingham",
                dropoff: "Leeds",
                fare: 35.00,
                seats: 3
            },
            {
                pickup: "Edinburgh",
                dropoff: "Glasgow",
                fare: 25.00,
                seats: 4
            },
            {
                pickup: "Liverpool",
                dropoff: "Manchester",
                fare: 20.00,
                seats: 3
            },
            {
                pickup: "Oxford",
                dropoff: "Cambridge",
                fare: 30.00,
                seats: 4
            }
        ];

        for (const ride of sampleRides) {
            // Set departure time to a random time in the next 7 days
            const departureTime = new Date();
            departureTime.setDate(departureTime.getDate() + Math.floor(Math.random() * 7) + 1);
            departureTime.setHours(Math.floor(Math.random() * 12) + 8); // Between 8 AM and 8 PM

            await db.query(
                `INSERT INTO ride (driver_id, pickup_location, dropoff_location, 
                                 departureTime, seatsAvailable, fare, status) 
                 VALUES (?, ?, ?, ?, ?, ?, 'accepted')`,
                [req.session.userId, ride.pickup, ride.dropoff, 
                 departureTime, ride.seats, ride.fare]
            );
        }

        res.redirect("/rides");
    } catch (err) {
        console.error("Error adding sample rides:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Show Create Ride Form
router.get("/create", async (req, res) => {
    try {
        const [drivers] = await db.query(`
            SELECT 
                driver_id,
                name,
                vehicle_details,
                CONCAT(name, ' - ', COALESCE(vehicle_details, 'No vehicle details')) as display_name
            FROM driver
            ORDER BY name
        `);
        console.log('Fetched drivers for create form:', drivers);
        res.render("rides/createRide", { 
            drivers,
            error: req.query.error
        });
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
        const [rides] = await db.query(
            `SELECT r.*, d.name as driver_name, d.vehicle_details
             FROM ride r
             LEFT JOIN driver d ON r.driver_id = d.driver_id
             WHERE r.ride_id = ?`, 
            [req.params.rideId]
        );
        
        if (!rides || rides.length === 0) {
            return res.status(404).render("404");
        }
        
        const ride = rides[0]; // Get the first (and should be only) ride
        res.render("rides/rideDetails", { ride });
    } catch (err) {
        console.error("Error fetching ride details:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

module.exports = router;

