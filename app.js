const express = require("express");
const path = require("path");
const session = require('express-session');

// ✅ Create Express app
const app = express();

// ✅ Set PUG as the view engine
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "../views")); // ✅ Ensure the correct path to views

// ✅ Middleware
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // set to true if using https
}));

// Make session data available to all views
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// ✅ Import Database Connection
const db = require("../services/db");

// Import Services
const externalApiService = require('../services/external-apis');

// ✅ Import Routes
const ridesRoutes = require("../routes/rides");
const reviewsRoutes = require("../routes/reviews");
const studentRoutes = require("../routes/student");
const adminRoutes = require("../routes/admin");
const driverRoutes = require("../routes/driver");
const authRoutes = require("../routes/auth");
const profileRoutes = require("../routes/profile");
const messagesRoutes = require("../routes/messages");
const reportsRoutes = require("../routes/reports");
const userReportsRoutes = require("../routes/user-reports");
const apiRoutes = require("../routes/api");

// ✅ Register Routes
app.use("/auth", authRoutes);
app.use("/rides", ridesRoutes);
app.use("/reviews", reviewsRoutes);
app.use("/student", studentRoutes);
app.use("/admin", adminRoutes);
app.use("/driver", driverRoutes);
app.use("/profile", profileRoutes);
app.use("/messages", messagesRoutes);
app.use("/reports", reportsRoutes);
app.use("/user-reports", userReportsRoutes);
app.use("/api", apiRoutes);

// Import messaging service to ensure tables exist
const messageService = require('../services/messaging');

// Ensure messaging tables exist
(async () => {
  try {
    await messageService.ensureMessagingTablesExist();
    console.log('Messaging tables setup completed!');
  } catch (err) {
    console.error('Error setting up messaging tables:', err);
  }
})();

// ✅ Home Page Route
app.get("/", (req, res) => {
    res.render("home", {
        user: req.session.userId ? {
            name: req.session.name,
            type: req.session.userType
        } : null
    });
});

// API Usage Dashboard Route (admin only)
app.get("/api-dashboard", (req, res) => {
    // In a real app, we would check if the user is an admin
    if (!req.session.userId || req.session.userType !== 'admin') {
        return res.redirect('/auth/login');
    }
    
    // Mock usage statistics for demo purposes
    // In a real app, we would get this from a database
    const usageStats = {
        totalCalls: 124,
        weatherApiCalls: 53,
        geocodingApiCalls: 47,
        distanceApiCalls: 24,
        averageResponseTime: 180, // ms
        successRate: 96.8, // percentage
        lastHourCalls: 12,
        peakHour: '15:00-16:00',
        callsByService: {
            'weather': [5, 8, 15, 12, 8, 5],
            'geocoding': [3, 6, 12, 10, 9, 7],
            'distance': [2, 4, 8, 6, 3, 1]
        },
        timeLabels: ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00']
    };
    
    res.render("api-dashboard", {
        title: "API Usage Dashboard",
        usageStats
    });
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
const PORT = process.env.PORT || 3002;
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

module.exports = app;
