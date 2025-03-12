const express = require("express");
const router = express.Router();
const db = require("../services/db");  // ✅ Ensure correct path

// ✅ Render Rides List in PUG
router.get("/list", async (req, res) => {
    try {
        const rides = await db.query("SELECT * FROM ride");
        console.log("✅ Rides Data Fetched:", rides);  // ✅ Debug log
        res.render("rides", { title: "Available Rides", rides });
    } catch (error) {
        console.error("❌ Error Fetching Rides:", error.message);
        res.status(500).render("error", { title: "Error", message: error.message });
    }
});

// ✅ Search for rides (Case-insensitive, Date is Optional)
// ✅ Search for rides (Fix Case Sensitivity & Optional Date)
router.get("/search", async (req, res) => {
    const { pickup, destination, date } = req.query;
    console.log("🔎 Search Params:", req.query);  // ✅ Debug log

    try {
        let query = "SELECT * FROM ride WHERE LOWER(pickupLocation) = LOWER(?) AND LOWER(destination) = LOWER(?)";
        let params = [pickup, destination];

        if (date) {
            query += " AND DATE(departureTime) = ?";
            params.push(date);
        }

        const rides = await db.query(query, params);
        console.log("✅ Search Results:", rides);

        res.render("rides", { title: "Search Results", rides });
    } catch (error) {
        console.error("❌ Error Searching Rides:", error.message);
        res.status(500).render("error", { title: "Error", message: error.message });
    }
});


// ✅ Render Ride Details
router.get("/:rideID", async (req, res) => {
    const { rideID } = req.params;
    try {
        const ride = await db.query("SELECT * FROM ride WHERE rideID = ?", [rideID]);
        if (ride.length === 0) return res.status(404).render("error", { title: "Error", message: "Ride not found" });

        res.render("rideDetails", { title: "Ride Details", ride: ride[0] });  // ✅ Show ride details
    } catch (error) {
        res.status(500).render("error", { title: "Error", message: error.message });
    }
});

// ✅ Post a new ride (Form Submission)
// ✅ Post a new ride (Form Submission)
router.post("/create", async (req, res) => {
    const { driverID, pickupLocation, destination, departureTime, seatsAvailable, price } = req.body;

    if (!driverID || !pickupLocation || !destination || !departureTime || !seatsAvailable || !price) {
        console.log("❌ Missing Fields in Form Submission:", req.body);
        return res.status(400).render("error", { title: "Error", message: "All fields are required!" });
    }

    try {
        await db.query(
            "INSERT INTO ride (driverID, pickupLocation, destination, departureTime, seatsAvailable, price) VALUES (?, ?, ?, ?, ?, ?)",
            [driverID, pickupLocation, destination, departureTime, seatsAvailable, price]
        );
        console.log("✅ Ride Created Successfully:", req.body);
        res.redirect("/rides/list");  // ✅ Redirect to rides list after adding
    } catch (error) {
        console.error("❌ Error Creating Ride:", error.message);
        res.status(500).render("error", { title: "Error", message: error.message });
    }
});


module.exports = router;
