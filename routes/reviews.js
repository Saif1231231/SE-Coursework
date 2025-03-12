const express = require("express");
const router = express.Router();
const db = require("../services/db");

// ✅ Show Reviews Page
router.get("/", async (req, res) => {
    try {
        const reviews = await db.query("SELECT * FROM review");
        res.render("reviews/reviews", { reviews });
    } catch (err) {
        console.error("Error fetching reviews:", err);
        res.status(500).send("Database error.");
    }
});

module.exports = router;
