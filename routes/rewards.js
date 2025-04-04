const express = require('express');
const router = express.Router();
const pointsService = require('../services/points');
const db = require('../services/db');

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
}

// Admin authentication middleware
function isAdmin(req, res, next) {
  if (!req.session.userId || req.session.userType !== 'admin') {
    return res.status(403).render('error', {
      message: 'Access denied',
      error: { status: 403, stack: 'Administrators only' }
    });
  }
  next();
}

// Get user points and rewards dashboard
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userType = req.session.userType;
    
    // Get points history
    const pointsData = await pointsService.getUserPointsHistory(userId, userType);
    
    // Check if user is a driver to get rating info
    let rating = null;
    
    if (userType === 'driver') {
      const [drivers] = await db.query(
        'SELECT rating FROM driver WHERE driver_id = ?',
        [userId]
      );
      
      if (drivers.length > 0) {
        rating = drivers[0].rating;
      }
    }
    
    // Get available rewards based on points
    const [rewards] = await db.query('SELECT * FROM rewards WHERE points_required <= ?', [pointsData.points]);
    
    // Get user's claimed rewards
    const [claimedRewards] = await db.query(
      'SELECT r.*, cr.claimed_at FROM claimed_rewards cr JOIN rewards r ON cr.reward_id = r.reward_id WHERE cr.user_id = ? AND cr.user_type = ?',
      [userId, userType]
    );
    
    res.render('rewards/index', {
      title: 'Points & Rewards',
      points: pointsData.points,
      history: pointsData.history,
      rewards,
      claimedRewards,
      rating,
      userType
    });
  } catch (err) {
    console.error('Error loading rewards dashboard:', err);
    res.status(500).render('error', {
      message: 'Failed to load rewards dashboard',
      error: err
    });
  }
});

// Claim a reward
router.post('/claim/:rewardId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userType = req.session.userType;
    const rewardId = req.params.rewardId;
    
    // Get user points
    const pointsData = await pointsService.getUserPointsHistory(userId, userType);
    
    // Get reward details
    const [rewards] = await db.query(
      'SELECT * FROM rewards WHERE reward_id = ?',
      [rewardId]
    );
    
    if (rewards.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Reward not found'
      });
    }
    
    const reward = rewards[0];
    
    // Check if user has enough points
    if (pointsData.points < reward.points_required) {
      return res.status(400).json({
        success: false,
        error: 'Not enough points to claim this reward'
      });
    }
    
    // Check if reward is already claimed
    const [claimedRewards] = await db.query(
      'SELECT * FROM claimed_rewards WHERE user_id = ? AND user_type = ? AND reward_id = ?',
      [userId, userType, rewardId]
    );
    
    if (claimedRewards.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You have already claimed this reward'
      });
    }
    
    // Claim the reward
    await db.query(
      'INSERT INTO claimed_rewards (user_id, user_type, reward_id) VALUES (?, ?, ?)',
      [userId, userType, rewardId]
    );
    
    // Deduct points
    await pointsService.addUserPoints(
      userId,
      userType,
      -reward.points_required,
      'reward_claimed',
      rewardId,
      `Claimed reward: ${reward.name}`
    );
    
    res.json({
      success: true,
      message: `Successfully claimed ${reward.name}`,
      code: reward.reward_code
    });
  } catch (err) {
    console.error('Error claiming reward:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Admin: View all users and their points
router.get('/admin', isAdmin, async (req, res) => {
  try {
    // Get all passengers with points
    const [passengers] = await db.query(
      'SELECT passenger_id as id, name, email, points, "passenger" as type FROM passenger ORDER BY points DESC'
    );
    
    // Get all drivers with points and ratings
    const [drivers] = await db.query(
      'SELECT driver_id as id, name, email, points, rating, "driver" as type FROM driver ORDER BY points DESC'
    );
    
    res.render('rewards/admin', {
      title: 'User Points Management',
      passengers,
      drivers
    });
  } catch (err) {
    console.error('Error loading admin rewards page:', err);
    res.status(500).render('error', {
      message: 'Failed to load user points data',
      error: err
    });
  }
});

// Admin: Add points to a user
router.post('/admin/add-points', isAdmin, async (req, res) => {
  try {
    const { userId, userType, points, description } = req.body;
    
    if (!userId || !userType || !points) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    const result = await pointsService.addPromoPoints(
      userId,
      userType,
      parseInt(points),
      description || 'Admin added points'
    );
    
    if (result.success) {
      res.json({
        success: true,
        message: `Added ${points} points to user`
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (err) {
    console.error('Error adding points:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router; 