const express = require('express');
const router = express.Router();
const db = require('../services/db');  // ✅ Ensure correct path

// ✅ Render Rides List in PUG
router.get('/list', async (req, res) => {
    try {
        const rides = await db.query("SELECT * FROM ride");
        res.render("rides", { title: "Available Rides", rides });  // ✅ Render rides.pug with ride data
    } catch (error) {
        res.status(500).render("error", { title: "Error", message: error.message });
    }
});

// ✅ Search for rides (Case-insensitive, Date is Optional)
router.get('/search', async (req, res) => {
    const { pickup, destination, date } = req.query;

    try {
        let query = "SELECT * FROM ride WHERE LOWER(pickupLocation) = LOWER(?) AND LOWER(destination) = LOWER(?)";
        let params = [pickup, destination];

        if (date) {
            query += " AND DATE(departureTime) = ?";
            params.push(date);
        }

        const rides = await db.query(query, params);
        res.render("rides", { title: "Search Results", rides });  // ✅ Display results in PUG
    } catch (error) {
        res.status(500).render("error", { title: "Error", message: error.message });
    }
});

// ✅ Post a new ride (Form Submission)
router.post('/create', async (req, res) => {
    const { driverID, pickupLocation, destination, departureTime, seatsAvailable, price } = req.body;

    if (!driverID || !pickupLocation || !destination || !departureTime || !seatsAvailable || !price) {
        return res.status(400).render("error", { title: "Error", message: "All fields are required!" });
    }

    try {
        await db.query(
            "INSERT INTO ride (driverID, pickupLocation, destination, departureTime, seatsAvailable, price) VALUES (?, ?, ?, ?, ?, ?)",
            [driverID, pickupLocation, destination, departureTime, seatsAvailable, price]
        );
        res.redirect("/rides/list");  // ✅ Redirect to rides list after adding
    } catch (error) {
        res.status(500).render("error", { title: "Error", message: error.message });
    }
});

module.exports = router;
