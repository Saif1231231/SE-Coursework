const express = require('express');
const router = express.Router();

// Test route for /reviews
router.get('/list', (req, res) => {
    res.send("List of reviews (Test Route)");
});

module.exports = router;
