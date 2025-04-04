const db = require('./db');

/**
 * Add points to a user
 * @param {number} userId - The ID of the user
 * @param {string} userType - The type of the user (passenger, driver)
 * @param {number} points - The number of points to add
 * @param {string} activityType - The type of activity (ride_completed, review_submitted, etc.)
 * @param {number|null} relatedEntityId - Optional related entity ID (ride_id, review_id, etc.)
 * @param {string} description - Description of the activity
 * @returns {Promise<Object>} Result of the operation
 */
async function addUserPoints(userId, userType, points, activityType, relatedEntityId = null, description) {
  try {
    await db.query(
      'CALL add_user_points(?, ?, ?, ?, ?, ?)',
      [userId, userType, points, activityType, relatedEntityId, description]
    );
    
    return {
      success: true,
      points: points
    };
  } catch (error) {
    console.error('Error adding user points:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update a driver's rating
 * @param {number} driverId - The ID of the driver
 * @returns {Promise<Object>} Result of the operation
 */
async function updateDriverRating(driverId) {
  try {
    await db.query(
      'CALL update_driver_rating(?)',
      [driverId]
    );
    
    // Get the updated rating
    const [drivers] = await db.query(
      'SELECT rating FROM driver WHERE driver_id = ?',
      [driverId]
    );
    
    if (drivers.length === 0) {
      throw new Error('Driver not found');
    }
    
    return {
      success: true,
      rating: drivers[0].rating
    };
  } catch (error) {
    console.error('Error updating driver rating:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Award points for completing a ride
 * @param {number} rideId - The ID of the ride
 * @returns {Promise<Object>} Result of the operation
 */
async function awardRideCompletionPoints(rideId) {
  try {
    await db.query(
      'CALL award_ride_completion_points(?)',
      [rideId]
    );
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error awarding ride completion points:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Award points for submitting a review
 * @param {number} reviewId - The ID of the review
 * @returns {Promise<Object>} Result of the operation
 */
async function awardReviewPoints(reviewId) {
  try {
    await db.query(
      'CALL award_review_points(?)',
      [reviewId]
    );
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error awarding review points:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get user points and activity history
 * @param {number} userId - The ID of the user
 * @param {string} userType - The type of the user (passenger, driver)
 * @returns {Promise<Object>} Points and activity history
 */
async function getUserPointsHistory(userId, userType) {
  try {
    const [results] = await db.query(
      'CALL get_user_points_history(?, ?)',
      [userId, userType]
    );
    
    // First result set is the current points
    const currentPoints = results[0][0]?.points || 0;
    
    // Second result set is the activity history
    const activityHistory = results[1] || [];
    
    return {
      success: true,
      points: currentPoints,
      history: activityHistory
    };
  } catch (error) {
    console.error('Error getting user points history:', error);
    return {
      success: false,
      error: error.message,
      points: 0,
      history: []
    };
  }
}

/**
 * Add special promo or manual points
 * @param {number} userId - The ID of the user
 * @param {string} userType - The type of the user (passenger, driver)
 * @param {number} points - The number of points to add
 * @param {string} description - Description of the promotion
 * @returns {Promise<Object>} Result of the operation
 */
async function addPromoPoints(userId, userType, points, description) {
  return addUserPoints(userId, userType, points, 'promotion', null, description);
}

/**
 * Add referral points
 * @param {number} userId - The ID of the user who referred
 * @param {string} userType - The type of the user (passenger, driver)
 * @param {number} referredUserId - The ID of the user who was referred
 * @returns {Promise<Object>} Result of the operation
 */
async function addReferralPoints(userId, userType, referredUserId) {
  const points = 100; // Points for referring a new user
  return addUserPoints(
    userId, 
    userType, 
    points, 
    'referral', 
    referredUserId, 
    'Points earned for referring a new user'
  );
}

module.exports = {
  addUserPoints,
  updateDriverRating,
  awardRideCompletionPoints,
  awardReviewPoints,
  getUserPointsHistory,
  addPromoPoints,
  addReferralPoints
};