const express = require("express");
const path = require("path");

const app = express();

// ✅ Set PUG as the view engine
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// ✅ Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Import Database Connection
const db = require("./services/db");

// ✅ Import Routes
const ridesRoutes = require("./routes/rides");
const bookingsRoutes = require("./routes/bookings");
const reviewsRoutes = require("./routes/reviews");

// ✅ Register Routes
app.use("/rides", ridesRoutes);
app.use("/bookings", bookingsRoutes);
app.use("/reviews", reviewsRoutes);

// ✅ Home Page Route
app.get("/", (req, res) => {
    res.render("home", { title: "Welcome to Ride Sharing!" });
});

// ✅ Handle 404 Errors
app.use((req, res) => {
    res.status(404).render("404", { title: "Page Not Found" });
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running at http://127.0.0.1:${PORT}/`);
});


