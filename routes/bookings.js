const express = require('express');
const router = express.Router();

// ✅ Test route for /bookings
router.get('/list', (req, res) => {
    res.send("List of bookings (Test Route)");
});

module.exports = router;

