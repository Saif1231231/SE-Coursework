const express = require("express");
const router = express.Router();
const db = require("../services/db");

// Show Reviews Page with filtering and sorting options
router.get("/", async (req, res) => {
    try {
        // Get filter and sort parameters
        const status = req.query.status || 'all';
        const rating = req.query.rating || 'all';
        const sort = req.query.sort || 'newest';
        
        // Base query
        let query = `
            SELECT r.*, 
                   p.name as passenger_name,
                   d.name as driver_name,
                   rd.pickup_location,
                   rd.dropoff_location,
                   DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_at
            FROM review r
            LEFT JOIN passenger p ON r.passenger_id = p.passenger_id
            LEFT JOIN driver d ON r.driver_id = d.driver_id
            LEFT JOIN ride rd ON r.ride_id = rd.ride_id
            WHERE 1=1
        `;
        
        // Apply filters
        if (status !== 'all') {
            query += ` AND r.status = '${status}'`;
        }
        
        if (rating !== 'all') {
            query += ` AND r.rating = ${parseInt(rating)}`;
        }
        
        // Apply sorting
        if (sort === 'newest') {
            query += ` ORDER BY r.created_at DESC`;
        } else if (sort === 'oldest') {
            query += ` ORDER BY r.created_at ASC`;
        } else if (sort === 'highest') {
            query += ` ORDER BY r.rating DESC, r.created_at DESC`;
        } else if (sort === 'lowest') {
            query += ` ORDER BY r.rating ASC, r.created_at DESC`;
        } else if (sort === 'most_helpful') {
            query += ` ORDER BY r.helpful_count DESC, r.created_at DESC`;
        }
        
        // Execute query
        const [reviewsResult] = await db.query(query);

        // Get rides, passengers, and drivers for the form
        const [ridesResult] = await db.query(`
            SELECT 
                ride_id, 
                pickup_location, 
                dropoff_location, 
                DATE_FORMAT(departureTime, '%Y-%m-%d %H:%i:%s') as departureTime 
            FROM ride 
            WHERE status = 'completed'
        `);
        const [passengersResult] = await db.query("SELECT passenger_id, name FROM passenger");
        const [driversResult] = await db.query("SELECT driver_id, name FROM driver");

        // Format the reviews data
        const reviews = reviewsResult.map(review => {
            return {
                ...review,
                // Use the formatted date from MySQL
                created_at: review.formatted_created_at || review.created_at
            };
        });

        res.render("reviews/reviews", { 
            reviews,
            rides: ridesResult,
            passengers: passengersResult,
            drivers: driversResult,
            filters: {
                status: status,
                rating: rating,
                sort: sort
            }
        });
    } catch (err) {
        console.error("Error fetching reviews:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Handle Review Creation
router.post("/create", async (req, res) => {
    try {
        const { rating, review, rideId, passengerId, driverId } = req.body;
        
        // Validate input
        if (!rating || !rideId || !passengerId || !driverId) {
            return res.status(400).send("All fields are required except comment");
        }

        // Check if a review already exists for this combination
        const [existingReviews] = await db.query(
            `SELECT * FROM review 
             WHERE ride_id = ? AND passenger_id = ? AND driver_id = ?`,
            [rideId, passengerId, driverId]
        );

        if (existingReviews && existingReviews.length > 0) {
            // Update existing review
            await db.query(
                `UPDATE review SET rating = ?, comment = ?, created_at = NOW(), status = 'pending' 
                 WHERE ride_id = ? AND passenger_id = ? AND driver_id = ?`,
                [rating, review || null, rideId, passengerId, driverId]
            );
        } else {
            // Insert new review
            await db.query(
                `INSERT INTO review (ride_id, passenger_id, driver_id, rating, comment, created_at, status) 
                 VALUES (?, ?, ?, ?, ?, NOW(), 'pending')`,
                [rideId, passengerId, driverId, rating, review || null]
            );
        }
        
        res.redirect("/reviews");
    } catch (err) {
        console.error("Error creating review:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Mark review as helpful/unhelpful
router.post("/feedback", async (req, res) => {
    try {
        const { reviewId, isHelpful, userId, userType } = req.body;
        
        // Check if user has already given feedback
        const [existingFeedback] = await db.query(
            `SELECT * FROM review_feedback 
             WHERE review_id = ? AND user_id = ? AND user_type = ?`,
            [reviewId, userId, userType]
        );
        
        if (existingFeedback && existingFeedback.length > 0) {
            // Update existing feedback
            if (existingFeedback[0].is_helpful !== (isHelpful === 'true')) {
                // User is changing their feedback
                await db.query(
                    `UPDATE review_feedback 
                     SET is_helpful = ?, created_at = NOW() 
                     WHERE feedback_id = ?`,
                    [isHelpful === 'true', existingFeedback[0].feedback_id]
                );
                
                // Update review counts
                if (isHelpful === 'true') {
                    await db.query(
                        `UPDATE review 
                         SET helpful_count = helpful_count + 1, unhelpful_count = unhelpful_count - 1 
                         WHERE review_id = ?`,
                        [reviewId]
                    );
                } else {
                    await db.query(
                        `UPDATE review 
                         SET helpful_count = helpful_count - 1, unhelpful_count = unhelpful_count + 1 
                         WHERE review_id = ?`,
                        [reviewId]
                    );
                }
            }
            // If feedback is the same, do nothing
        } else {
            // Insert new feedback
            await db.query(
                `INSERT INTO review_feedback (review_id, user_id, user_type, is_helpful) 
                 VALUES (?, ?, ?, ?)`,
                [reviewId, userId, userType, isHelpful === 'true']
            );
            
            // Update review counts
            if (isHelpful === 'true') {
                await db.query(
                    `UPDATE review 
                     SET helpful_count = helpful_count + 1 
                     WHERE review_id = ?`,
                    [reviewId]
                );
            } else {
                await db.query(
                    `UPDATE review 
                     SET unhelpful_count = unhelpful_count + 1 
                     WHERE review_id = ?`,
                    [reviewId]
                );
            }
        }
        
        res.redirect("/reviews");
    } catch (err) {
        console.error("Error handling review feedback:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Report a review
router.post("/report", async (req, res) => {
    try {
        const { reviewId, reporterId, reporterType, reason, description } = req.body;
        
        // Validate input
        if (!reviewId || !reporterId || !reporterType || !reason) {
            return res.status(400).send("All fields are required except description");
        }
        
        // Create report
        await db.query(
            `INSERT INTO review_report (review_id, reporter_id, reporter_type, reason, description) 
             VALUES (?, ?, ?, ?, ?)`,
            [reviewId, reporterId, reporterType, reason, description || null]
        );
        
        res.redirect("/reviews");
    } catch (err) {
        console.error("Error reporting review:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Admin: Update review status
router.post("/moderate", async (req, res) => {
    try {
        const { reviewId, status } = req.body;
        
        // Update review status
        await db.query(
            `UPDATE review SET status = ? WHERE review_id = ?`,
            [status, reviewId]
        );
        
        res.redirect("/reviews");
    } catch (err) {
        console.error("Error moderating review:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

// Get review details 
router.get("/:id", async (req, res) => {
    try {
        const reviewId = req.params.id;
        
        // Get review details
        const [reviewResults] = await db.query(
            `SELECT r.*, 
                    p.name as passenger_name,
                    d.name as driver_name,
                    rd.pickup_location,
                    rd.dropoff_location,
                    DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_at
             FROM review r
             LEFT JOIN passenger p ON r.passenger_id = p.passenger_id
             LEFT JOIN driver d ON r.driver_id = d.driver_id
             LEFT JOIN ride rd ON r.ride_id = rd.ride_id
             WHERE r.review_id = ?`,
            [reviewId]
        );
        
        if (!reviewResults || reviewResults.length === 0) {
            return res.status(404).send("Review not found");
        }
        
        // Get reports for this review
        const [reportResults] = await db.query(
            `SELECT rr.*,
                    CASE 
                        WHEN rr.reporter_type = 'passenger' THEN p.name
                        WHEN rr.reporter_type = 'driver' THEN d.name
                        WHEN rr.reporter_type = 'admin' THEN a.name
                    END as reporter_name
             FROM review_report rr
             LEFT JOIN passenger p ON rr.reporter_id = p.passenger_id AND rr.reporter_type = 'passenger'
             LEFT JOIN driver d ON rr.reporter_id = d.driver_id AND rr.reporter_type = 'driver'
             LEFT JOIN admin a ON rr.reporter_id = a.admin_id AND rr.reporter_type = 'admin'
             WHERE rr.review_id = ?`,
            [reviewId]
        );
        
        res.render("reviews/review-detail", {
            review: {
                ...reviewResults[0],
                created_at: reviewResults[0].formatted_created_at || reviewResults[0].created_at
            },
            reports: reportResults
        });
    } catch (err) {
        console.error("Error fetching review details:", err);
        res.status(500).send("Database error: " + err.message);
    }
});

module.exports = router;
