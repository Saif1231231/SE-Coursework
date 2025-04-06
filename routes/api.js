const express = require("express");
const router = express.Router();
const db = require("../services/db");
const externalApiService = require('../services/external-apis');

// Get users for reporting
router.get("/users", async (req, res) => {
    try {
        const type = req.query.type;
        
        if (!type || (type !== 'passenger' && type !== 'driver')) {
            return res.status(400).json({ error: "Invalid user type" });
        }
        
        let query;
        if (type === 'passenger') {
            query = `
                SELECT passenger_id as id, name 
                FROM passenger 
                WHERE suspended = FALSE
                ORDER BY name ASC
            `;
        } else {
            query = `
                SELECT driver_id as id, name 
                FROM driver 
                WHERE suspended = FALSE
                ORDER BY name ASC
            `;
        }
        
        const [usersResult] = await db.query(query);
        
        res.json(usersResult);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Get review statistics for user
router.get("/review-stats/:userId/:userType", async (req, res) => {
    try {
        const { userId, userType } = req.params;
        
        if (!userId || !userType || (userType !== 'passenger' && userType !== 'driver')) {
            return res.status(400).json({ error: "Invalid parameters" });
        }
        
        let query;
        if (userType === 'passenger') {
            query = `
                SELECT 
                    COUNT(*) as totalReviews,
                    AVG(rating) as avgRating,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approvedCount,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingCount,
                    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejectedCount,
                    SUM(helpful_count) as totalHelpful,
                    SUM(unhelpful_count) as totalUnhelpful
                FROM review
                WHERE passenger_id = ?
            `;
        } else {
            query = `
                SELECT 
                    COUNT(*) as totalReviews,
                    AVG(rating) as avgRating,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approvedCount,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingCount,
                    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejectedCount,
                    SUM(helpful_count) as totalHelpful,
                    SUM(unhelpful_count) as totalUnhelpful
                FROM review
                WHERE driver_id = ?
            `;
        }
        
        const [statsResult] = await db.query(query, [userId]);
        
        res.json(statsResult[0]);
    } catch (err) {
        console.error("Error fetching review stats:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Get report statistics for user
router.get("/report-stats/:userId/:userType", async (req, res) => {
    try {
        const { userId, userType } = req.params;
        
        if (!userId || !userType || (userType !== 'passenger' && userType !== 'driver')) {
            return res.status(400).json({ error: "Invalid parameters" });
        }
        
        const query = `
            SELECT 
                COUNT(*) as totalReports,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingCount,
                COUNT(CASE WHEN status = 'investigating' THEN 1 END) as investigatingCount,
                COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolvedCount,
                COUNT(CASE WHEN status = 'dismissed' THEN 1 END) as dismissedCount,
                COUNT(CASE WHEN reason = 'inappropriate_behavior' THEN 1 END) as inappropriateCount,
                COUNT(CASE WHEN reason = 'safety_concern' THEN 1 END) as safetyCount,
                COUNT(CASE WHEN reason = 'fraud' THEN 1 END) as fraudCount,
                COUNT(CASE WHEN reason = 'discrimination' THEN 1 END) as discriminationCount,
                COUNT(CASE WHEN reason = 'harassment' THEN 1 END) as harassmentCount,
                COUNT(CASE WHEN reason = 'other' THEN 1 END) as otherCount
            FROM user_report
            WHERE reported_id = ? AND reported_type = ?
        `;
        
        const [statsResult] = await db.query(query, [userId, userType]);
        
        res.json(statsResult[0]);
    } catch (err) {
        console.error("Error fetching report stats:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// API route for geocoding an address
router.get('/geocode', async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ 
        error: 'Address parameter is required' 
      });
    }
    
    const geocodeResult = await externalApiService.geocodeAddress(address);
    res.json(geocodeResult);
  } catch (error) {
    console.error('Geocoding API error:', error);
    res.status(500).json({ 
      error: 'Error geocoding address',
      message: error.message
    });
  }
});

// API route for fetching weather data
router.get('/weather', async (req, res) => {
  try {
    const { location } = req.query;
    
    if (!location) {
      return res.status(400).json({ 
        error: 'Location parameter is required' 
      });
    }
    
    const weatherData = await externalApiService.getWeatherForecast(location);
    res.json(weatherData);
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({ 
      error: 'Error fetching weather data',
      message: error.message
    });
  }
});

// API route for calculating distance between two points
router.get('/distance', async (req, res) => {
  try {
    const { origin, destination } = req.query;
    
    if (!origin || !destination) {
      return res.status(400).json({ 
        error: 'Both origin and destination parameters are required' 
      });
    }
    
    // Parse coordinates from query params (format: "lat,lng")
    const [originLat, originLng] = origin.split(',').map(coord => parseFloat(coord));
    const [destLat, destLng] = destination.split(',').map(coord => parseFloat(coord));
    
    // Check if coordinates are valid numbers
    if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
      return res.status(400).json({ 
        error: 'Invalid coordinates format. Use "lat,lng" for both origin and destination.' 
      });
    }
    
    const distanceData = await externalApiService.calculateDistance(
      { lat: originLat, lng: originLng },
      { lat: destLat, lng: destLng }
    );
    
    res.json(distanceData);
  } catch (error) {
    console.error('Distance API error:', error);
    res.status(500).json({ 
      error: 'Error calculating distance',
      message: error.message
    });
  }
});

// Basic health check API
router.get('/status', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'API is running' 
  });
});

module.exports = router; 