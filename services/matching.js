const db = require('./db');

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

module.exports = {
  findMatchingRides,
  findPotentialPassengers,
  matchPassengerToRide,
  confirmBooking,
  cancelBooking
}; 