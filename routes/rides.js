const express = require("express");
const router = express.Router();
const db = require("../services/db");
const matchingService = require("../services/matching");
const externalApiService = require('../services/external-apis');

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

// Smart Ride Matching route - uses the advanced matching algorithm
router.get("/smart-match", async (req, res) => {
    try {
        // Get search parameters from query string
        const { 
            pickupLocation, 
            dropoffLocation, 
            departureTime, 
            maxPrice,
            minDriverRating,
            preferFemaleDriver,
            needsAccessibility,
            preferredVehicleType,
            avoidHighways,
            considerWeather
        } = req.query;
        
        // Validate required parameters
        if (!pickupLocation || !dropoffLocation) {
            return res.render("smart-match", { 
                rides: [],
                errorMessage: "Please provide both pickup and dropoff locations",
                searchParams: req.query
            });
        }
        
        // Get weather forecast for the pickup location
        let weatherData = null;
        try {
            if (considerWeather !== 'false') {
                weatherData = await externalApiService.getWeatherForecast(pickupLocation);
            }
        } catch (error) {
            console.warn('Could not fetch weather data:', error);
        }
        
        // Get geocoding for the locations
        let locationData = {};
        try {
            const pickupGeocode = await externalApiService.geocodeAddress(pickupLocation);
            const dropoffGeocode = await externalApiService.geocodeAddress(dropoffLocation);
            
            // If both geocodes are valid, calculate the distance
            if (pickupGeocode && pickupGeocode.coordinates && 
                dropoffGeocode && dropoffGeocode.coordinates) {
                
                const distanceData = await externalApiService.calculateDistance(
                    pickupGeocode.coordinates,
                    dropoffGeocode.coordinates
                );
                
                locationData = {
                    pickup: pickupGeocode,
                    dropoff: dropoffGeocode,
                    distance: distanceData
                };
            }
        } catch (error) {
            console.warn('Could not fetch location data:', error);
        }
        
        // Format search criteria for the matching service
        const searchCriteria = {
            pickupLocation,
            dropoffLocation,
            departureTime: departureTime ? new Date(departureTime) : new Date(),
            maxPrice: maxPrice ? parseFloat(maxPrice) : null,
            passengerId: req.session.userId || null
        };
        
        // Format user preferences
        const userPreferences = {
            minDriverRating: minDriverRating ? parseFloat(minDriverRating) : null,
            preferFemaleDriver: preferFemaleDriver === 'true',
            needsAccessibility: needsAccessibility === 'true',
            preferredVehicleTypes: preferredVehicleType ? 
                [preferredVehicleType] : ['car', 'sedan', 'suv', 'van'],
            avoidHighways: avoidHighways === 'true',
            considerWeather: considerWeather === 'true'
        };
        
        // Use the advanced matching service to find matching rides
        const matchingRides = await matchingService.findAdvancedMatches(searchCriteria, userPreferences);
        
        // Render the results
        res.render("smart-match", { 
            rides: matchingRides, 
            searchParams: req.query,
            showAdvancedOptions: true,
            useAdvancedMatching: true,
            weatherData: weatherData,
            locationData: locationData,
            successMessage: matchingRides.length > 0 
                ? `Found ${matchingRides.length} matching rides!` 
                : "No matching rides found. Try adjusting your search criteria."
        });
    } catch (err) {
        console.error("Error in smart matching:", err);
        res.render("smart-match", { 
            rides: [],
            errorMessage: "An error occurred while finding matching rides: " + err.message,
            searchParams: req.query,
            showAdvancedOptions: true,
            useAdvancedMatching: true
        });
    }
});

// Book a ride using the matching service
router.post("/book/:rideId", async (req, res) => {
    try {
        // Ensure user is logged in
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                error: "You must be logged in to book a ride" 
            });
        }
        
        const rideId = parseInt(req.params.rideId);
        const passengerId = req.session.userId;
        
        // Use matching service to create the booking
        const result = await matchingService.matchPassengerToRide(passengerId, rideId);
        
        if (result.success) {
            return res.status(200).json({ 
                success: true, 
                message: "Ride booked successfully!",
                bookingId: result.bookingId
            });
        } else {
            return res.status(400).json({ 
                success: false, 
                error: result.error 
            });
        }
    } catch (err) {
        console.error("Error booking ride:", err);
        return res.status(500).json({ 
            success: false, 
            error: "An error occurred while booking the ride: " + err.message 
        });
    }
});

module.exports = router;

