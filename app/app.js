const express = require("express");
const path = require("path");

// ✅ Create Express app
const app = express();

// ✅ Set PUG as the view engine
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "../views")); // ✅ Ensure the correct path to views

// ✅ Middleware
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Import Database Connection
const db = require("../services/db");

// ✅ Import Routes (Ensure the paths are correct)
const ridesRoutes = require("../routes/rides");
const reviewsRoutes = require("../routes/reviews");

// ✅ Register Routes
app.use("/rides", ridesRoutes);
app.use("/reviews", reviewsRoutes);

// ✅ Home Page Route
app.get("/", (req, res) => {
    res.render("home", { title: "Welcome to Ride Sharing!" });
});

// ✅ Test Database Route (for debugging)
app.get("/db_test", async (req, res) => {
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
    res.status(404).render("404", { title: "Page Not Found" });
});

// ✅ Start Server Only if DB is Connected
const PORT = process.env.PORT || 3000;
db.query("SELECT 1") // Check DB connection
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running at http://127.0.0.1:${PORT}/`);
    });
  })
  .catch((err) => {
    console.error("❌ Unable to start server. Database connection failed.");
    process.exit(1); // Exit process if DB connection is broken
  });
