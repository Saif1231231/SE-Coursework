const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../services/db');
const messageService = require('../services/messaging');

// Debug route - This should be accessible regardless of authentication
router.get('/test', (req, res) => {
  console.log('Messages router test route accessed');
  return res.send('Messages router is working! If you can see this, the router is accessible.');
});

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (!req.session.userId) {
    console.log('User not authenticated, redirecting to login');
    return res.redirect('/auth/login?redirectTo=' + encodeURIComponent(req.originalUrl));
  }
  console.log('User authenticated:', req.session.userId, req.session.userType);
  next();
}

// Middleware to load unread message count for all message routes
router.use(async (req, res, next) => {
  console.log('Messages middleware running');
  if (req.session.userId) {
    try {
      console.log('Getting unread count for user:', req.session.userId, req.session.userType);
      const unreadCount = await messageService.getUnreadMessageCount(
        req.session.userId,
        req.session.userType
      );
      
      console.log('Unread message count:', unreadCount);
      // Store the count in the session for the navigation bar badge
      req.session.unreadMessageCount = unreadCount;
    } catch (err) {
      console.error('Error getting unread message count:', err);
      // Continue even if there's an error
    }
  } else {
    console.log('No user session, skipping unread count');
  }
  next();
});

// Get all message threads for the current user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    console.log('Loading message threads page');
    console.log('Session data:', {
      userId: req.session.userId,
      userType: req.session.userType,
      sessionID: req.sessionID
    });
    
    const userId = req.session.userId;
    const userType = req.session.userType;
    
    if (!userId || !userType) {
      console.error('Missing user ID or user type in session');
      return res.status(400).render('error', {
        message: 'User session information is incomplete',
        error: { status: 400 }
      });
    }
    
    console.log(`Fetching message threads for ${userType} ${userId}`);
    let threads = [];
    
    try {
      threads = await messageService.getMessageThreads(userId, userType);
      console.log(`Found ${threads.length} threads for user`);
    } catch (err) {
      console.error('Error in getMessageThreads:', err);
      // Continue with empty threads array
    }
    
    // Render the page with message threads
    return res.render('messages/index', {
      title: 'Messages',
      threads,
      userId,
      userType
    });
  } catch (err) {
    console.error('Error getting message threads:', err);
    return res.status(500).render('error', {
      message: 'Failed to load messages',
      error: err
    });
  }
});

// Get a specific message thread
router.get('/thread/:threadId', isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.threadId;
    const userId = req.session.userId;
    const userType = req.session.userType;
    
    console.log(`Loading thread ${threadId} for user ${userId} (${userType})`);
    
    if (!threadId) {
      console.error('Thread ID is missing from request');
      return res.status(400).render('error', {
        message: 'Thread ID is required'
      });
    }
    
    if (!userId || !userType) {
      console.error('Missing user ID or user type in session');
      return res.status(400).render('error', {
        message: 'User session information is incomplete',
        error: { status: 400 }
      });
    }
    
    // Get thread messages
    console.log(`Fetching messages for thread ${threadId}`);
    const messages = await messageService.getThreadMessages(threadId, userId, userType);
    console.log(`Found ${messages.length} messages in thread ${threadId}`);
    
    // Get thread information
    console.log(`Fetching thread information for ${threadId}`);
    const [threads] = await db.query(`
      SELECT 
        mt.*,
        CASE 
          WHEN mt.participant1_id = ? AND mt.participant1_type = ? THEN mt.participant2_id
          ELSE mt.participant1_id
        END AS other_participant_id,
        CASE 
          WHEN mt.participant1_id = ? AND mt.participant1_type = ? THEN mt.participant2_type
          ELSE mt.participant1_type
        END AS other_participant_type
      FROM message_thread mt
      WHERE mt.thread_id = ?
    `, [userId, userType, userId, userType, threadId]);
    
    if (threads.length === 0) {
      console.log(`Thread ${threadId} not found`);
      return res.status(404).render('error', {
        message: 'Thread not found'
      });
    }
    
    const thread = threads[0];
    console.log(`Thread ${threadId} found with participants:`, {
      participant1: { id: thread.participant1_id, type: thread.participant1_type },
      participant2: { id: thread.participant2_id, type: thread.participant2_type },
      other: { id: thread.other_participant_id, type: thread.other_participant_type }
    });
    
    // Get the other participant's name
    let tableName, idField;
    
    if (thread.other_participant_type === 'passenger') {
      tableName = 'passenger';
      idField = 'passenger_id';
    } else if (thread.other_participant_type === 'driver') {
      tableName = 'driver';
      idField = 'driver_id';
    } else if (thread.other_participant_type === 'admin') {
      tableName = 'admin';
      idField = 'admin_id';
    }
    
    console.log(`Fetching other participant name from ${tableName} where ${idField}=${thread.other_participant_id}`);
    const [users] = await db.query(
      `SELECT name FROM ${tableName} WHERE ${idField} = ?`,
      [thread.other_participant_id]
    );
    
    thread.other_participant_name = users.length > 0 ? users[0].name : 'Unknown User';
    console.log(`Thread between user and ${thread.other_participant_name}`);
    
    return res.render('messages/thread', {
      title: thread.subject || 'Conversation with ' + thread.other_participant_name,
      thread,
      messages,
      userId,
      userType
    });
  } catch (err) {
    console.error('Error getting thread messages:', err);
    return res.status(500).render('error', {
      message: 'Failed to load messages',
      error: err
    });
  }
});

// Show new message form
router.get('/new', isAuthenticated, async (req, res) => {
  try {
    console.log('Loading new message form');
    const userId = req.session.userId;
    const userType = req.session.userType;
    
    // If recipient info is provided in query params, pre-select them
    const recipientId = req.query.to_id;
    const recipientType = req.query.to_type;
    const rideId = req.query.ride_id;
    let selectedRecipient = null;
    
    if (recipientId && recipientType) {
      console.log(`Pre-selected recipient: ${recipientType} ${recipientId}`);
      let tableName, idField;
      
      if (recipientType === 'passenger') {
        tableName = 'passenger';
        idField = 'passenger_id';
      } else if (recipientType === 'driver') {
        tableName = 'driver';
        idField = 'driver_id';
      } else if (recipientType === 'admin') {
        tableName = 'admin';
        idField = 'admin_id';
      }
      
      const [users] = await db.query(
        `SELECT ${idField} as id, name FROM ${tableName} WHERE ${idField} = ?`,
        [recipientId]
      );
      
      if (users.length > 0) {
        selectedRecipient = {
          id: users[0].id,
          name: users[0].name,
          type: recipientType
        };
        console.log(`Selected recipient: ${selectedRecipient.name}`);
      }
    }
    
    // Get list of available recipients
    console.log(`Getting available users for ${userType} ${userId}`);
    const recipients = await messageService.getAvailableUsers(userType, userId);
    console.log(`Found ${recipients.length} available recipients`);
    
    // If rideId is provided, get ride details
    let ride = null;
    
    if (rideId) {
      console.log(`Getting ride details for ride ${rideId}`);
      const [rides] = await db.query('SELECT * FROM ride WHERE ride_id = ?', [rideId]);
      if (rides.length > 0) {
        ride = rides[0];
        console.log(`Found ride: ${ride.pickup_location} to ${ride.dropoff_location}`);
      }
    }
    
    res.render('messages/new', {
      title: 'New Message',
      recipients,
      selectedRecipient,
      ride,
      rideId
    });
  } catch (err) {
    console.error('Error loading new message form:', err);
    res.status(500).render('error', {
      message: 'Failed to load new message form',
      error: err
    });
  }
});

// Send a new message
router.post('/send', isAuthenticated, [
  body('recipient').notEmpty().withMessage('Recipient is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('content').notEmpty().withMessage('Message content is required')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    const senderId = req.session.userId;
    const senderType = req.session.userType;
    const subject = req.body.subject;
    const content = req.body.content;
    const rideId = req.body.rideId || null;
    
    // Parse recipient ID and type
    const [recipientType, recipientId] = req.body.recipient.split(':');
    
    if (!recipientId || !recipientType) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipient'
      });
    }
    
    // Send the message
    const result = await messageService.sendMessage(
      senderId, 
      senderType, 
      recipientId, 
      recipientType, 
      subject, 
      content,
      rideId
    );
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Message sent successfully',
        threadId: result.threadId
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send message'
      });
    }
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Reply to a message thread
router.post('/thread/:threadId/reply', isAuthenticated, [
  body('content').notEmpty().withMessage('Message content is required')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    const threadId = req.params.threadId;
    const senderId = req.session.userId;
    const senderType = req.session.userType;
    const content = req.body.content;
    
    // Get thread information to know who to send the reply to
    const [threads] = await db.query(`
      SELECT 
        mt.*,
        CASE 
          WHEN mt.participant1_id = ? AND mt.participant1_type = ? THEN mt.participant2_id
          ELSE mt.participant1_id
        END AS recipient_id,
        CASE 
          WHEN mt.participant1_id = ? AND mt.participant1_type = ? THEN mt.participant2_type
          ELSE mt.participant1_type
        END AS recipient_type
      FROM message_thread mt
      WHERE mt.thread_id = ?
    `, [senderId, senderType, senderId, senderType, threadId]);
    
    if (threads.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Thread not found'
      });
    }
    
    const thread = threads[0];
    
    // Send the reply
    const result = await messageService.sendMessage(
      senderId,
      senderType,
      thread.recipient_id,
      thread.recipient_type,
      thread.subject, // Use the existing subject
      content,
      thread.ride_id
    );
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Reply sent successfully',
        threadId
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send reply'
      });
    }
  } catch (err) {
    console.error('Error sending reply:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// API endpoint to get unread message count
router.get('/api/unread-count', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userType = req.session.userType;
    
    const unreadCount = await messageService.getUnreadMessageCount(userId, userType);
    
    // Also update the session
    req.session.unreadMessageCount = unreadCount;
    
    res.json({ unreadCount });
  } catch (err) {
    console.error('Error getting unread message count:', err);
    res.status(500).json({
      error: 'Failed to get unread message count'
    });
  }
});

// Direct messaging test page
router.get('/test', async (req, res) => {
  try {
    console.log('Loading direct messaging test page');
    
    // Update unread count if user is logged in
    if (req.session && req.session.userId) {
      const unreadCount = await messageService.getUnreadMessageCount(
        req.session.userId,
        req.session.userType
      );
      req.session.unreadMessageCount = unreadCount;
    }
    
    res.render('messages/direct-test', {
      title: 'Test Messaging System'
    });
  } catch (err) {
    console.error('Error loading test page:', err);
    res.status(500).render('error', {
      message: 'Failed to load test page',
      error: err
    });
  }
});

// Debug route to test messages access
router.get('/debug', async (req, res) => {
  try {
    console.log('Messages debug route accessed with session:', {
      userId: req.session.userId,
      userType: req.session.userType,
      isAuthenticated: !!req.session.userId
    });
    
    // Return a simple JSON response with session info
    res.json({
      success: true,
      session: {
        userId: req.session.userId,
        userType: req.session.userType,
        isAuthenticated: !!req.session.userId
      },
      requestInfo: {
        path: req.path,
        originalUrl: req.originalUrl,
        method: req.method
      }
    });
  } catch (err) {
    console.error('Error in messages debug route:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Catch-all route for undefined paths under /messages
router.use('*', (req, res) => {
  console.error(`Undefined messages route accessed: ${req.originalUrl}`);
  
  // Check if user is authenticated
  if (!req.session.userId) {
    console.log('User not authenticated, redirecting to login');
    return res.redirect('/auth/login?redirectTo=' + encodeURIComponent('/messages'));
  }
  
  // For authenticated users, redirect to the main messages page
  return res.redirect('/messages');
});

module.exports = router; 