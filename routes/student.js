const express = require('express');
const router = express.Router();
const db = require('../services/db');

// Set default user session for all student routes
router.use((req, res, next) => {
    if (!req.session.userId) {
        // Set a default student user session
        req.session.userId = 1; // Assuming ID 1 exists in your passenger table
        req.session.userType = 'passenger';
    }
    next();
});

// Student Dashboard
router.get('/', (req, res) => {
    res.render('student/dashboard');
});

// Transport Page
router.get('/transport', async (req, res) => {
    try {
        const { whereFrom, whereTo } = req.query;
        let query = `
            SELECT 
                r.ride_id,
                r.pickup_location,
                r.dropoff_location,
                r.departureTime,
                r.seatsAvailable,
                r.fare,
                r.status,
                d.name as driver_name
            FROM ride r
            LEFT JOIN driver d ON r.driver_id = d.driver_id
            WHERE r.seatsAvailable > 0 
            AND r.status = 'accepted'
        `;
        
        const params = [];
        
        // Add search parameters if provided
        if (whereFrom) {
            query += ` AND r.pickup_location LIKE ?`;
            params.push(`%${whereFrom}%`);
        }
        
        if (whereTo) {
            query += ` AND r.dropoff_location LIKE ?`;
            params.push(`%${whereTo}%`);
        }
        
        query += ` ORDER BY r.departureTime`;
        
        const [rides] = await db.query(query, params);
        
        // If search was performed from favorites, update last_used timestamp
        if (whereFrom && whereTo) {
            try {
                await db.query(`
                    UPDATE favorite_routes 
                    SET last_used = NOW() 
                    WHERE passenger_id = ? 
                    AND pickup_location LIKE ? 
                    AND dropoff_location LIKE ?
                `, [req.session.userId, `%${whereFrom}%`, `%${whereTo}%`]);
                
                // Get location and weather data if both locations are provided
                try {
                    const externalApiService = require('../services/external-apis');
                    
                    // Fetch data in parallel for better performance
                    const [pickupGeocode, dropoffGeocode, weatherData] = await Promise.all([
                        externalApiService.geocodeAddress(whereFrom),
                        externalApiService.geocodeAddress(whereTo),
                        externalApiService.getWeatherForecast(whereFrom)
                    ]);
                    
                    // If both geocodes are valid, calculate the distance
                    let distanceData = null;
                    if (pickupGeocode && pickupGeocode.coordinates && 
                        dropoffGeocode && dropoffGeocode.coordinates) {
                        
                        distanceData = await externalApiService.calculateDistance(
                            pickupGeocode.coordinates,
                            dropoffGeocode.coordinates
                        );
                    }
                    
                    // Include the API data in the response
                    return res.render('student/transport', {
                        rides, 
                        searchQuery: { whereFrom, whereTo },
                        locationData: {
                            pickup: pickupGeocode ? JSON.parse(JSON.stringify(pickupGeocode)) : null,
                            dropoff: dropoffGeocode ? JSON.parse(JSON.stringify(dropoffGeocode)) : null,
                            distance: distanceData ? JSON.parse(JSON.stringify(distanceData)) : null
                        },
                        weatherData: weatherData ? JSON.parse(JSON.stringify(weatherData)) : null
                    });
                } catch (apiError) {
                    console.warn('Could not fetch external API data:', apiError);
                    // Continue with the normal response if API calls fail
                }
            } catch (err) {
                console.log('No matching favorite found or error updating last_used:', err);
            }
        }
        
        // Default response without API data
        res.render('student/transport', { 
            rides, 
            searchQuery: { whereFrom, whereTo } 
        });
    } catch (err) {
        console.error('Error fetching rides:', err);
        res.status(500).send('Database error: ' + err.message);
    }
});

// Search Rides
router.post('/transport/search', async (req, res) => {
    try {
        const { whereFrom, whereTo } = req.body;
        
        // Get basic rides data
        const [rides] = await db.query(`
            SELECT 
                r.ride_id,
                r.pickup_location,
                r.dropoff_location,
                r.departureTime,
                r.seatsAvailable,
                r.fare,
                r.status,
                d.name as driver_name
            FROM ride r
            LEFT JOIN driver d ON r.driver_id = d.driver_id
            WHERE r.seatsAvailable > 0 
            AND r.status = 'accepted'
            AND (r.pickup_location LIKE ? OR ? = '')
            AND (r.dropoff_location LIKE ? OR ? = '')
            ORDER BY r.departureTime
        `, [`%${whereFrom}%`, whereFrom, `%${whereTo}%`, whereTo]);
        
        // If both locations were provided, check if this is a favorite route
        if (whereFrom && whereTo) {
            try {
                // Check if this route is already a favorite
                const [favorites] = await db.query(`
                    SELECT id FROM favorite_routes 
                    WHERE passenger_id = ? 
                    AND pickup_location LIKE ? 
                    AND dropoff_location LIKE ?
                `, [req.session.userId, `%${whereFrom}%`, `%${whereTo}%`]);
                
                // If it's already a favorite, update last_used
                if (favorites.length > 0) {
                    await db.query(`
                        UPDATE favorite_routes 
                        SET last_used = NOW() 
                        WHERE id = ?
                    `, [favorites[0].id]);
                }
                
                // Get location and weather data if both locations are provided
                if (whereFrom && whereTo) {
                    try {
                        const externalApiService = require('../services/external-apis');
                        
                        // Fetch data in parallel for better performance
                        const [pickupGeocode, dropoffGeocode, weatherData] = await Promise.all([
                            externalApiService.geocodeAddress(whereFrom),
                            externalApiService.geocodeAddress(whereTo),
                            externalApiService.getWeatherForecast(whereFrom)
                        ]);
                        
                        // If both geocodes are valid, calculate the distance
                        let distanceData = null;
                        if (pickupGeocode && pickupGeocode.coordinates && 
                            dropoffGeocode && dropoffGeocode.coordinates) {
                            
                            distanceData = await externalApiService.calculateDistance(
                                pickupGeocode.coordinates,
                                dropoffGeocode.coordinates
                            );
                        }
                        
                        // Include the API data in the response
                        return res.render('student/transport', {
                            rides,
                            searchQuery: { whereFrom, whereTo },
                            locationData: {
                                pickup: pickupGeocode ? JSON.parse(JSON.stringify(pickupGeocode)) : null,
                                dropoff: dropoffGeocode ? JSON.parse(JSON.stringify(dropoffGeocode)) : null,
                                distance: distanceData ? JSON.parse(JSON.stringify(distanceData)) : null
                            },
                            weatherData: weatherData ? JSON.parse(JSON.stringify(weatherData)) : null
                        });
                    } catch (apiError) {
                        console.warn('Could not fetch external API data:', apiError);
                        // Continue with the normal response if API calls fail
                    }
                }
            } catch (err) {
                console.log('Error checking favorite status:', err);
            }
        }
        
        // Default response without API data
        res.render('student/transport', { rides, searchQuery: { whereFrom, whereTo } });
    } catch (err) {
        console.error('Error searching rides:', err);
        res.status(500).send('Database error: ' + err.message);
    }
});

// Bookings Page
router.get('/bookings', async (req, res) => {
    try {
        const [bookings] = await db.query(`
            SELECT 
                b.*,
                r.pickup_location,
                r.dropoff_location,
                r.departureTime,
                r.fare,
                r.status as ride_status,
                d.name as driver_name
            FROM booking b
            JOIN ride r ON b.ride_id = r.ride_id
            LEFT JOIN driver d ON r.driver_id = d.driver_id
            WHERE b.passenger_id = ?
            ORDER BY r.departureTime DESC
        `, [req.session.userId]);
        
        res.render('student/bookings', { 
            bookings,
            successMessage: req.query.success,
            errorMessage: req.query.error
        });
    } catch (err) {
        console.error('Error fetching bookings:', err);
        res.status(500).send('Database error: ' + err.message);
    }
});

// Cancel Booking
router.post('/bookings/:bookingId/cancel', async (req, res) => {
    try {
        await db.query(
            'UPDATE booking SET booking_status = "cancelled" WHERE booking_id = ? AND passenger_id = ?',
            [req.params.bookingId, req.session.userId]
        );
        res.redirect('/student/bookings');
    } catch (err) {
        console.error('Error cancelling booking:', err);
        res.status(500).send('Database error: ' + err.message);
    }
});

// Book a ride
router.get('/book-ride/:rideId', async (req, res) => {
    try {
        const rideId = req.params.rideId;
        const passengerId = req.session.userId;
        
        if (!passengerId) {
            return res.status(401).render('auth/login', { 
                message: 'You must be logged in to book a ride',
                userType: 'student'
            });
        }
        
        // Get ride details first to show confirmation
        const [rides] = await db.query(`
            SELECT 
                r.*,
                d.name as driver_name
            FROM ride r
            LEFT JOIN driver d ON r.driver_id = d.driver_id
            WHERE r.ride_id = ? AND r.seatsAvailable > 0 AND r.status = 'accepted'
        `, [rideId]);
        
        if (!rides || rides.length === 0) {
            return res.status(404).render('student/transport', { 
                errorMessage: 'Ride not found or no longer available' 
            });
        }
        
        const ride = rides[0];
        
        // Create the booking
        const [result] = await db.query(`
            INSERT INTO booking (passenger_id, driver_id, ride_id, booking_status)
            VALUES (?, ?, ?, 'confirmed')
        `, [passengerId, ride.driver_id, rideId]);
        
        // Update seats available
        await db.query(`
            UPDATE ride SET seatsAvailable = seatsAvailable - 1 
            WHERE ride_id = ?
        `, [rideId]);
        
        // Redirect to bookings page with success message
        res.redirect('/student/bookings?success=Ride booked successfully');
    } catch (err) {
        console.error('Error booking ride:', err);
        res.redirect('/student/transport?error=' + encodeURIComponent('Error booking ride: ' + err.message));
    }
});

// ==== Favorite Routes ====

// List Favorite Routes
router.get('/favorites', async (req, res) => {
    try {
        // Get all favorites for the user
        const [favorites] = await db.query(`
            SELECT * FROM favorite_routes
            WHERE passenger_id = ?
            ORDER BY created_at DESC
        `, [req.session.userId]);
        
        // For each favorite, get upcoming rides matching the route
        const favoritesWithRides = [];
        
        for (const favorite of favorites) {
            const [matchingRides] = await db.query(`
                SELECT 
                    r.ride_id,
                    r.pickup_location,
                    r.dropoff_location,
                    r.departureTime,
                    r.seatsAvailable,
                    r.fare,
                    r.status,
                    d.name as driver_name
                FROM ride r
                LEFT JOIN driver d ON r.driver_id = d.driver_id
                WHERE r.status = 'accepted'
                AND r.seatsAvailable > 0
                AND r.pickup_location LIKE ?
                AND r.dropoff_location LIKE ?
                AND r.departureTime > NOW()
                ORDER BY r.departureTime
                LIMIT 3
            `, [`%${favorite.pickup_location}%`, `%${favorite.dropoff_location}%`]);
            
            favoritesWithRides.push({
                ...favorite,
                matchingRides: matchingRides || []
            });
        }
        
        res.render('student/favorites', { 
            favorites: favoritesWithRides,
            successMessage: req.query.success,
            errorMessage: req.query.error
        });
    } catch (err) {
        console.error('Error fetching favorite routes:', err);
        res.render('student/favorites', { 
            favorites: [],
            errorMessage: 'Error loading favorite routes: ' + err.message
        });
    }
});

// Add Favorite Route
router.post('/favorites/add', async (req, res) => {
    try {
        const { pickup_location, dropoff_location, note, redirect } = req.body;
        
        if (!pickup_location || !dropoff_location) {
            const errorMsg = encodeURIComponent('Both pickup and dropoff locations are required');
            return res.redirect(`/student/favorites?error=${errorMsg}`);
        }
        
        // Check if this route is already a favorite
        const [existingFavorites] = await db.query(`
            SELECT id FROM favorite_routes 
            WHERE passenger_id = ? 
            AND pickup_location = ? 
            AND dropoff_location = ?
        `, [req.session.userId, pickup_location, dropoff_location]);
        
        if (existingFavorites.length > 0) {
            // Update the existing favorite's last_used timestamp instead of adding a duplicate
            await db.query(`
                UPDATE favorite_routes 
                SET last_used = NOW(), note = COALESCE(?, note)
                WHERE id = ?
            `, [note || null, existingFavorites[0].id]);
            
            const successMsg = encodeURIComponent('Route already in favorites. Updated timestamp.');
            
            // Redirect based on where the request came from
            if (redirect) {
                return res.redirect(`${redirect}?success=${successMsg}`);
            }
            return res.redirect(`/student/favorites?success=${successMsg}`);
        }
        
        // Add new favorite
        await db.query(`
            INSERT INTO favorite_routes 
            (passenger_id, pickup_location, dropoff_location, note, created_at, last_used) 
            VALUES (?, ?, ?, ?, NOW(), NOW())
        `, [req.session.userId, pickup_location, dropoff_location, note || null]);
        
        const successMsg = encodeURIComponent('Route added to favorites successfully');
        
        // Redirect based on where the request came from
        if (redirect) {
            return res.redirect(`${redirect}?success=${successMsg}`);
        }
        return res.redirect(`/student/favorites?success=${successMsg}`);
    } catch (err) {
        console.error('Error adding favorite route:', err);
        const errorMsg = encodeURIComponent('Error adding favorite: ' + err.message);
        return res.redirect(`/student/favorites?error=${errorMsg}`);
    }
});

// Update Favorite Route
router.post('/favorites/:id/update', async (req, res) => {
    try {
        const { pickup_location, dropoff_location, note } = req.body;
        const favoriteId = req.params.id;
        
        if (!pickup_location || !dropoff_location) {
            return res.redirect('/student/favorites?error=Both pickup and dropoff locations are required');
        }
        
        // Ensure this favorite belongs to the current user
        const [favorites] = await db.query(`
            SELECT id FROM favorite_routes 
            WHERE id = ? AND passenger_id = ?
        `, [favoriteId, req.session.userId]);
        
        if (favorites.length === 0) {
            return res.redirect('/student/favorites?error=Favorite route not found');
        }
        
        // Update the favorite
        await db.query(`
            UPDATE favorite_routes 
            SET pickup_location = ?, dropoff_location = ?, note = ?
            WHERE id = ? AND passenger_id = ?
        `, [pickup_location, dropoff_location, note || null, favoriteId, req.session.userId]);
        
        res.redirect('/student/favorites?success=Favorite route updated');
    } catch (err) {
        console.error('Error updating favorite route:', err);
        res.redirect('/student/favorites?error=Error updating favorite: ' + err.message);
    }
});

// Delete Favorite Route
router.post('/favorites/:id/delete', async (req, res) => {
    try {
        const favoriteId = req.params.id;
        
        // Ensure this favorite belongs to the current user
        const [favorites] = await db.query(`
            SELECT id FROM favorite_routes 
            WHERE id = ? AND passenger_id = ?
        `, [favoriteId, req.session.userId]);
        
        if (favorites.length === 0) {
            return res.redirect('/student/favorites?error=Favorite route not found');
        }
        
        // Delete the favorite
        await db.query(`
            DELETE FROM favorite_routes 
            WHERE id = ? AND passenger_id = ?
        `, [favoriteId, req.session.userId]);
        
        res.redirect('/student/favorites?success=Favorite route removed');
    } catch (err) {
        console.error('Error deleting favorite route:', err);
        res.redirect('/student/favorites?error=Error removing favorite: ' + err.message);
    }
});

module.exports = router; 