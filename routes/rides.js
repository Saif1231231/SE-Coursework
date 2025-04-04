const express = require("express");
const router = express.Router();
const db = require("../services/db");

// Show Available Rides
router.get("/", async (req, res) => {
    try {
        const query = `
            SELECT 
                r.*,
                d.name as driver_name,
                DATE_FORMAT(r.departureTime, '%Y-%m-%d %H:%i:%s') as formatted_departure_time,
                CASE 
                    WHEN r.ride_id = 1 THEN 'Marcus Rashford'
                    WHEN r.ride_id = 2 THEN 'Harry Kane'
                    WHEN r.ride_id = 3 THEN 'Jack Grealish'
                    WHEN r.ride_id = 4 THEN 'Bukayo Saka'
                    WHEN r.ride_id = 5 THEN 'Phil Foden'
                    WHEN r.ride_id = 6 THEN 'Jude Bellingham'
                    WHEN r.ride_id = 7 THEN 'Declan Rice'
                    WHEN r.ride_id = 8 THEN 'Trent Alexander-Arnold'
                    WHEN r.ride_id = 9 THEN 'Jordan Henderson'
                    WHEN r.ride_id = 10 THEN 'Mason Mount'
                    ELSE 'Not assigned'
                END as passenger_name,
                CASE 
                    WHEN r.ride_id = 1 THEN '+44 20 7123 4567'
                    WHEN r.ride_id = 2 THEN '+44 20 7123 4568'
                    WHEN r.ride_id = 3 THEN '+44 20 7123 4569'
                    WHEN r.ride_id = 4 THEN '+44 20 7123 4570'
                    WHEN r.ride_id = 5 THEN '+44 20 7123 4571'
                    WHEN r.ride_id = 6 THEN '+44 20 7123 4572'
                    WHEN r.ride_id = 7 THEN '+44 20 7123 4573'
                    WHEN r.ride_id = 8 THEN '+44 20 7123 4574'
                    WHEN r.ride_id = 9 THEN '+44 20 7123 4575'
                    WHEN r.ride_id = 10 THEN '+44 20 7123 4576'
                    ELSE 'Not available'
                END as passenger_phone
            FROM ride r
            LEFT JOIN driver d ON r.driver_id = d.driver_id
            ORDER BY r.departureTime ASC
        `;

        const [rides] = await db.query(query);

        // Simple formatting for display
        const formattedRides = rides.map(ride => ({
            ...ride,
            fare: parseFloat(ride.fare).toFixed(2),
            driver_name: ride.driver_name || 'Not assigned',
            departureTime: ride.formatted_departure_time || ride.departureTime
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
            },
            {
                pickup: "Cardiff",
                dropoff: "Bristol",
                fare: 28.00,
                seats: 3
            },
            {
                pickup: "Nottingham",
                dropoff: "Sheffield",
                fare: 22.00,
                seats: 4
            },
            {
                pickup: "Newcastle",
                dropoff: "Sunderland",
                fare: 15.00,
                seats: 3
            },
            {
                pickup: "Brighton",
                dropoff: "Portsmouth",
                fare: 18.00,
                seats: 4
            },
            {
                pickup: "Leicester",
                dropoff: "Coventry",
                fare: 16.00,
                seats: 3
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
                 VALUES (?, ?, ?, ?, ?, ?, 'requested')`,
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
            `SELECT r.*, 
                d.name as driver_name, 
                d.vehicle_details,
                DATE_FORMAT(r.departureTime, '%Y-%m-%d %H:%i:%s') as formatted_departure_time
             FROM ride r
             LEFT JOIN driver d ON r.driver_id = d.driver_id
             WHERE r.ride_id = ?`, 
            [req.params.rideId]
        );
        
        if (!rides || rides.length === 0) {
            return res.status(404).render("404");
        }
        
        const ride = rides[0]; // Get the first (and should be only) ride
        ride.departureTime = ride.formatted_departure_time || ride.departureTime;
        
        res.render("rides/rideDetails", { ride });
    } catch (err) {
        console.error("Error fetching ride details:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

module.exports = router;

