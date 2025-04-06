const db = require('./db');
const pointsService = require('./points');
const externalApiService = require('./external-apis');

/**
 * Find matching rides for a passenger
 * @param {Object} criteria - Search criteria
 * @param {string} criteria.pickupLocation - The pickup location
 * @param {string} criteria.dropoffLocation - The dropoff location
 * @param {Date} criteria.departureTime - The departure time
 * @param {number} criteria.maxDistance - Maximum distance willing to travel (in miles/km)
 * @param {number} criteria.maxPrice - Maximum price willing to pay
 * @param {number} criteria.passengerId - The passenger ID (to exclude own rides)
 * @returns {Promise<Array>} Array of matching rides
 */
async function findMatchingRides(criteria) {
  try {
    // Basic matching based on location similarity and time proximity
    // This is a simplistic approach, for a real app you would use geographic coordinates and distance calculations
    const [rides] = await db.query(`
      SELECT 
        r.*,
        d.name as driver_name,
        d.rating as driver_rating
      FROM ride r
      LEFT JOIN driver d ON r.driver_id = d.driver_id
      WHERE 
        r.status = 'requested' OR r.status = 'accepted'
        AND r.seatsAvailable > 0
        AND r.passenger_id IS NULL 
        AND (r.passenger_id != ? OR r.passenger_id IS NULL)
        AND r.departureTime >= NOW()
        AND r.departureTime <= DATE_ADD(?, INTERVAL 2 HOUR)
        AND (
          (r.pickup_location LIKE CONCAT('%', ?, '%') OR ? LIKE CONCAT('%', r.pickup_location, '%'))
          OR
          (r.dropoff_location LIKE CONCAT('%', ?, '%') OR ? LIKE CONCAT('%', r.dropoff_location, '%'))
        )
        AND (? IS NULL OR r.fare <= ?)
      ORDER BY 
        ABS(TIMESTAMPDIFF(MINUTE, r.departureTime, ?)) ASC,
        (
          CASE
            WHEN r.pickup_location = ? AND r.dropoff_location = ? THEN 0
            WHEN r.pickup_location = ? THEN 1
            WHEN r.dropoff_location = ? THEN 2
            ELSE 3
          END
        ) ASC,
        r.departureTime ASC
      LIMIT 20
    `, [
      criteria.passengerId,
      criteria.departureTime,
      criteria.pickupLocation, criteria.pickupLocation,
      criteria.dropoffLocation, criteria.dropoffLocation,
      criteria.maxPrice, criteria.maxPrice,
      criteria.departureTime,
      criteria.pickupLocation, criteria.dropoffLocation,
      criteria.pickupLocation, criteria.dropoffLocation
    ]);
    
    return rides;
  } catch (error) {
    console.error('Error finding matching rides:', error);
    throw error;
  }
}

/**
 * Find matching passengers for a driver's ride
 * @param {number} rideId - The ride ID
 * @returns {Promise<Array>} Array of potential passengers
 */
async function findPotentialPassengers(rideId) {
  try {
    // First, get the ride details
    const [rides] = await db.query(
      'SELECT * FROM ride WHERE ride_id = ?',
      [rideId]
    );
    
    if (rides.length === 0) {
      throw new Error('Ride not found');
    }
    
    const ride = rides[0];
    
    // Find passenger ride requests that match this ride
    // This is a basic implementation
    const [passengers] = await db.query(`
      SELECT 
        p.*,
        b.booking_id,
        b.booking_status
      FROM passenger p
      LEFT JOIN booking b ON p.passenger_id = b.passenger_id AND b.ride_id = ?
      WHERE 
        p.verified = TRUE
        AND p.suspended = FALSE
        AND (b.passenger_id IS NULL OR b.booking_status = 'pending')
      ORDER BY 
        CASE WHEN b.booking_id IS NOT NULL THEN 0 ELSE 1 END,
        p.created_at DESC
      LIMIT 10
    `, [rideId]);
    
    return passengers;
  } catch (error) {
    console.error('Error finding potential passengers:', error);
    throw error;
  }
}

/**
 * Match a passenger to a ride and create a booking
 * @param {number} passengerId - The passenger ID
 * @param {number} rideId - The ride ID
 * @returns {Promise<Object>} Result of the operation
 */
async function matchPassengerToRide(passengerId, rideId) {
  try {
    // Check if ride exists and has available seats
    const [rides] = await db.query(
      'SELECT * FROM ride WHERE ride_id = ? AND seatsAvailable > 0 AND (status = "requested" OR status = "accepted")',
      [rideId]
    );
    
    if (rides.length === 0) {
      return {
        success: false,
        error: 'Ride not found or no seats available'
      };
    }
    
    // Check if passenger exists
    const [passengers] = await db.query(
      'SELECT * FROM passenger WHERE passenger_id = ? AND verified = TRUE AND suspended = FALSE',
      [passengerId]
    );
    
    if (passengers.length === 0) {
      return {
        success: false,
        error: 'Passenger not found or not verified'
      };
    }
    
    // Check if booking already exists
    const [existingBookings] = await db.query(
      'SELECT * FROM booking WHERE passenger_id = ? AND ride_id = ?',
      [passengerId, rideId]
    );
    
    if (existingBookings.length > 0) {
      return {
        success: false,
        error: 'Booking already exists',
        bookingId: existingBookings[0].booking_id
      };
    }
    
    // Create booking
    const [result] = await db.query(
      'INSERT INTO booking (passenger_id, driver_id, ride_id, booking_status) VALUES (?, ?, ?, "pending")',
      [passengerId, rides[0].driver_id, rideId]
    );
    
    // Update seats available
    await db.query(
      'UPDATE ride SET seatsAvailable = seatsAvailable - 1 WHERE ride_id = ?',
      [rideId]
    );
    
    return {
      success: true,
      bookingId: result.insertId
    };
  } catch (error) {
    console.error('Error matching passenger to ride:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Confirm a booking
 * @param {number} bookingId - The booking ID
 * @param {number} driverId - The driver ID (for verification)
 * @returns {Promise<Object>} Result of the operation
 */
async function confirmBooking(bookingId, driverId) {
  try {
    // Get booking details
    const [bookings] = await db.query(
      'SELECT * FROM booking WHERE booking_id = ?',
      [bookingId]
    );
    
    if (bookings.length === 0) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }
    
    const booking = bookings[0];
    
    // Verify driver
    if (booking.driver_id !== driverId) {
      return {
        success: false,
        error: 'Not authorized to confirm this booking'
      };
    }
    
    // Update booking status
    await db.query(
      'UPDATE booking SET booking_status = "confirmed" WHERE booking_id = ?',
      [bookingId]
    );
    
    // Get ride details
    const [rides] = await db.query(
      'SELECT * FROM ride WHERE ride_id = ?',
      [booking.ride_id]
    );
    
    // Update ride status if it was 'requested'
    if (rides.length > 0 && rides[0].status === 'requested') {
      await db.query(
        'UPDATE ride SET status = "accepted" WHERE ride_id = ?',
        [booking.ride_id]
      );
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error confirming booking:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cancel a booking
 * @param {number} bookingId - The booking ID
 * @param {number} userId - The user ID (passenger or driver)
 * @param {string} userType - The user type (passenger or driver)
 * @returns {Promise<Object>} Result of the operation
 */
async function cancelBooking(bookingId, userId, userType) {
  try {
    // Get booking details
    const [bookings] = await db.query(
      'SELECT * FROM booking WHERE booking_id = ?',
      [bookingId]
    );
    
    if (bookings.length === 0) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }
    
    const booking = bookings[0];
    
    // Verify user can cancel this booking
    if (
      (userType === 'passenger' && booking.passenger_id !== userId) ||
      (userType === 'driver' && booking.driver_id !== userId)
    ) {
      return {
        success: false,
        error: 'Not authorized to cancel this booking'
      };
    }
    
    // Update booking status
    await db.query(
      'UPDATE booking SET booking_status = "cancelled" WHERE booking_id = ?',
      [bookingId]
    );
    
    // Increase available seats
    await db.query(
      'UPDATE ride SET seatsAvailable = seatsAvailable + 1 WHERE ride_id = ?',
      [booking.ride_id]
    );
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error canceling booking:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Advanced matching that considers more factors 
 * for a more personalized ride-matching experience
 * @param {Object} criteria - Search criteria
 * @param {string} criteria.pickupLocation - The pickup location
 * @param {string} criteria.dropoffLocation - The dropoff location
 * @param {Date} criteria.departureTime - The departure time
 * @param {number} criteria.maxDistance - Maximum distance willing to travel (in miles/km)
 * @param {number} criteria.maxPrice - Maximum price willing to pay
 * @param {number} criteria.passengerId - The passenger ID (to exclude own rides)
 * @param {Object} preferences - Optional user preferences
 * @param {number} preferences.minDriverRating - Minimum acceptable driver rating
 * @param {boolean} preferences.preferFemaleDriver - Preference for female drivers
 * @param {boolean} preferences.needsAccessibility - Requires accessible vehicle
 * @param {string[]} preferences.preferredVehicleTypes - Preferred vehicle types
 * @param {boolean} preferences.avoidHighways - Preference to avoid highways
 * @param {boolean} preferences.considerWeather - Consider weather conditions
 * @returns {Promise<Array>} Array of matching rides with scoring
 */
async function findAdvancedMatches(criteria, preferences = {}) {
  try {
    // Get basic matching rides first
    const basicMatches = await findMatchingRides(criteria);
    
    if (!basicMatches || basicMatches.length === 0) {
      return [];
    }
    
    // If no passenger ID is provided, we can't do personalized matching
    if (!criteria.passengerId) {
      return basicMatches;
    }
    
    // Get passenger's ride history
    const [rideHistory] = await db.query(`
      SELECT 
        r.ride_id,
        r.driver_id,
        r.pickup_location,
        r.dropoff_location,
        b.booking_status,
        rev.rating
      FROM booking b
      JOIN ride r ON b.ride_id = r.ride_id
      LEFT JOIN review rev ON rev.ride_id = r.ride_id AND rev.reviewer_id = b.passenger_id
      WHERE b.passenger_id = ?
      ORDER BY r.departureTime DESC
      LIMIT 20
    `, [criteria.passengerId]);
    
    // Get passenger's favorite routes
    const [favoriteRoutes] = await db.query(`
      SELECT 
        fr.pickup_location,
        fr.dropoff_location,
        COUNT(*) as frequency,
        MAX(fr.last_used) as last_used
      FROM favorite_routes fr
      WHERE fr.passenger_id = ?
      GROUP BY fr.pickup_location, fr.dropoff_location
      ORDER BY frequency DESC
      LIMIT 5
    `, [criteria.passengerId]);
    
    // Get passenger's preferred drivers (ones they've rated highly)
    const [preferredDrivers] = await db.query(`
      SELECT 
        r.driver_id,
        d.name as driver_name,
        AVG(rev.rating) as avg_rating,
        COUNT(rev.review_id) as review_count
      FROM review rev
      JOIN ride r ON rev.ride_id = r.ride_id
      JOIN driver d ON r.driver_id = d.driver_id
      WHERE rev.reviewer_id = ? AND rev.rating >= 4
      GROUP BY r.driver_id
      ORDER BY avg_rating DESC
    `, [criteria.passengerId]);
    
    // Get geocoding for the pickup location
    let pickupCoordinates = null;
    try {
      const geocodeResult = await externalApiService.geocodeAddress(criteria.pickupLocation);
      if (geocodeResult && geocodeResult.coordinates) {
        pickupCoordinates = geocodeResult.coordinates;
      }
    } catch (error) {
      console.warn('Could not geocode pickup location:', error);
    }
    
    // Get geocoding for the dropoff location
    let dropoffCoordinates = null;
    try {
      const geocodeResult = await externalApiService.geocodeAddress(criteria.dropoffLocation);
      if (geocodeResult && geocodeResult.coordinates) {
        dropoffCoordinates = geocodeResult.coordinates;
      }
    } catch (error) {
      console.warn('Could not geocode dropoff location:', error);
    }
    
    // Weather API integration
    let weatherData = null;
    try {
      if (preferences.considerWeather !== false) {
        weatherData = await externalApiService.getWeatherForecast(criteria.pickupLocation);
      }
    } catch (error) {
      console.warn('Could not fetch weather data:', error);
    }
    
    // Get user points (for potential reward rides)
    let userPoints = 0;
    try {
      const pointsResult = await pointsService.getUserPointsHistory(criteria.passengerId, 'passenger');
      if (pointsResult.success) {
        userPoints = pointsResult.points;
      }
    } catch (error) {
      console.warn('Could not fetch user points:', error);
    }

    // Calculate accurate distances if coordinates are available
    let distanceData = {};
    if (pickupCoordinates && dropoffCoordinates) {
      try {
        distanceData = await externalApiService.calculateDistance(
          pickupCoordinates,
          dropoffCoordinates
        );
      } catch (error) {
        console.warn('Could not calculate distance:', error);
      }
    }

    // Score and rank the matches based on all factors
    const scoredMatches = await Promise.all(basicMatches.map(async (ride) => {
      let score = 100; // Base score
      const matchFactors = [];
      
      // Factor 1: Driver rating match with preferences
      if (preferences.minDriverRating && ride.driver_rating) {
        if (ride.driver_rating >= preferences.minDriverRating) {
          score += 15;
          matchFactors.push('High-rated driver');
        } else {
          score -= 10;
        }
      }
      
      // Factor 2: Previously used and highly rated drivers
      const preferredDriver = preferredDrivers.find(d => d.driver_id === ride.driver_id);
      if (preferredDriver) {
        score += 20;
        matchFactors.push('Preferred driver');
      }
      
      // Factor 3: Favorite route match
      const isFavoriteRoute = favoriteRoutes.some(
        fr => ride.pickup_location.includes(fr.pickup_location) && 
              ride.dropoff_location.includes(fr.dropoff_location)
      );
      if (isFavoriteRoute) {
        score += 25;
        matchFactors.push('Favorite route');
      }

      // Factor 4: Time proximity to requested time
      const requestedTime = new Date(criteria.departureTime).getTime();
      const rideTime = new Date(ride.departureTime).getTime();
      const timeDiffMinutes = Math.abs(requestedTime - rideTime) / (60 * 1000);
      
      if (timeDiffMinutes < 15) {
        score += 15;
        matchFactors.push('Departure time is perfect');
      } else if (timeDiffMinutes < 30) {
        score += 10;
        matchFactors.push('Departure time is close');
      }
      
      // Factor 5: Weather conditions
      if (weatherData && weatherData.current) {
        const vehicleTypes = ride.vehicle_type ? ride.vehicle_type.toLowerCase() : '';
        
        // Rainy conditions
        if (weatherData.current.is_rainy || weatherData.current.precipitation_chance > 50) {
          if (vehicleTypes.includes('car') || vehicleTypes.includes('sedan') || vehicleTypes.includes('suv')) {
            score += 15;
            matchFactors.push('Weather-appropriate vehicle (rain protection)');
          } else {
            score -= 10;
            matchFactors.push('Not ideal for current weather');
          }
        }
        
        // High winds
        if (weatherData.current.wind_speed > 20) {
          if (vehicleTypes.includes('bicycle') || vehicleTypes.includes('scooter') || vehicleTypes.includes('motorbike')) {
            score -= 15;
            matchFactors.push('Not ideal for current weather (high winds)');
          }
        }
        
        // Very hot weather
        if (weatherData.current.temp > 30) { // >30°C / 86°F
          if (vehicleTypes.includes('car') && ride.features && ride.features.includes('air_conditioning')) {
            score += 10;
            matchFactors.push('Air conditioned vehicle (hot weather)');
          }
        }
      }
      
      // Factor 6: Distance accuracy and route optimization using calculated distance
      if (distanceData && distanceData.distance) {
        // Compare actual route distance with linear distance
        const routeDistance = parseFloat(distanceData.distance.text);
        
        // If ride has a specified route distance
        if (ride.estimated_distance) {
          const estimatedDistance = parseFloat(ride.estimated_distance);
          const distanceDiff = Math.abs(routeDistance - estimatedDistance);
          
          // If the estimated distance is reasonably close to calculated distance
          if (distanceDiff / routeDistance < 0.1) { // Within 10%
            score += 10;
            matchFactors.push('Accurate route estimation');
          }
        }
        
        // Check if avoiding highways preference matches
        if (preferences.avoidHighways && ride.route_features && ride.route_features.includes('no_highways')) {
          score += 10;
          matchFactors.push('Avoids highways as preferred');
        }
      }
      
      // Factor 7: Price as a percentage of max price (lower is better)
      if (criteria.maxPrice) {
        const priceRatio = ride.fare / criteria.maxPrice;
        if (priceRatio < 0.7) {
          score += 15;
          matchFactors.push('Great price');
        } else if (priceRatio < 0.9) {
          score += 5;
          matchFactors.push('Good price');
        }
      }
      
      // Factor 8: Calculate time efficiency
      if (distanceData && distanceData.duration) {
        const durMinutes = distanceData.duration.value / 60;
        
        // If we have the ride's estimated duration
        if (ride.estimated_duration) {
          const estimatedDuration = parseFloat(ride.estimated_duration);
          const durationDiff = Math.abs(durMinutes - estimatedDuration);
          
          if (durationDiff / durMinutes < 0.15) { // Within 15%
            score += 5;
            matchFactors.push('Accurate time estimation');
          }
        }
        
        // Compare with standard transit times
        if (ride.estimated_duration && durMinutes < ride.estimated_duration * 0.8) {
          score += 15;
          matchFactors.push('Faster than average');
        }
      }
      
      // Factor 9: Accessibility preference match
      if (preferences.needsAccessibility) {
        if (ride.features && ride.features.includes('accessibility')) {
          score += 25; // High priority factor
          matchFactors.push('Accessible vehicle available');
        } else {
          score = 0; // Disqualify if accessibility needed but not available
          matchFactors.push('Does not meet accessibility requirements');
        }
      }
      
      // Factor 10: Driver gender preference
      if (preferences.preferFemaleDriver) {
        // We'd need to check driver's gender from database
        const [driverDetails] = await db.query('SELECT gender FROM driver WHERE driver_id = ?', [ride.driver_id]);
        if (driverDetails.length > 0 && driverDetails[0].gender === 'female') {
          score += 15;
          matchFactors.push('Female driver as preferred');
        }
      }
      
      // Return the ride with its score, matching factors and additional data
      return {
        ...ride,
        match_score: Math.min(100, Math.max(0, Math.round(score))), // Ensure score is 0-100
        match_factors: matchFactors,
        weather_info: weatherData ? {
          conditions: weatherData.current.conditions,
          temp: weatherData.current.temp,
          is_rainy: weatherData.current.is_rainy
        } : null,
        distance_info: distanceData ? {
          distance: distanceData.distance?.text,
          duration: distanceData.duration?.text
        } : null
      };
    }));
    
    // Filter out any rides with score 0 (disqualified)
    const validMatches = scoredMatches.filter(match => match.match_score > 0);
    
    // Sort by score (descending)
    return validMatches.sort((a, b) => b.match_score - a.match_score);
  } catch (error) {
    console.error('Error in advanced matching:', error);
    // Fall back to basic matching if advanced fails
    return findMatchingRides(criteria);
  }
}

module.exports = {
  findMatchingRides,
  findPotentialPassengers,
  matchPassengerToRide,
  confirmBooking,
  cancelBooking,
  findAdvancedMatches
}; 