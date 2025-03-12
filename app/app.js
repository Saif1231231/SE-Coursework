// Import express.js
const express = require("express");
const path = require("path");

const app = express();

// ✅ Set PUG as the view engine for frontend templates
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "../views"));  // ✅ Ensure correct views path

// ✅ Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, "../public")));

// ✅ Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Import Database Connection
const db = require("../services/db");

// ✅ Import Routes (Ensure these paths are correct)
const ridesRoutes = require("../routes/rides");
const bookingsRoutes = require("../routes/bookings");
const reviewsRoutes = require("../routes/reviews");

// ✅ Register Routes
app.use("/rides", ridesRoutes);
app.use("/bookings", bookingsRoutes);
app.use("/reviews", reviewsRoutes);

// ✅ Home Page Route (Render Home Page with PUG)
app.get("/", function (req, res) {
    res.render("home", { title: "Welcome to Ride Sharing!" });  // ✅ Updated path
});

// ✅ Test Database Connection
app.get("/db_test", async function (req, res) {
    try {
        const results = await db.query("SELECT * FROM test_table");  // Ensure this table exists
        console.log(results);
        res.json(results);
    } catch (err) {
        console.error("Database query error:", err);
        res.status(500).send("Database error");
    }
});

// ✅ Handle 404 Errors
app.use((req, res) => {
    res.status(404).render("404", { title: "Page Not Found" });  // ✅ Updated path
});

// ✅ Set the Port Dynamically (Supports .env)
const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
    console.log(`✅ Server running at http://127.0.0.1:${PORT}/`);
});
