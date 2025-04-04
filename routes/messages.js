const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const messageService = require('../services/messaging');
const db = require('../services/db');

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
}

// Get all message threads for the current user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userType = req.session.userType;
    
    const threads = await messageService.getMessageThreads(userId, userType);
    
    res.render('messages/index', {
      title: 'Messages',
      threads,
      userId,
      userType
    });
  } catch (err) {
    console.error('Error getting message threads:', err);
    res.status(500).render('error', {
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
    
    const messages = await messageService.getThreadMessages(threadId, userId, userType);
    
    // Get thread information
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
      return res.status(404).render('error', {
        message: 'Thread not found'
      });
    }
    
    const thread = threads[0];
    
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
    
    const [users] = await db.query(
      `SELECT name FROM ${tableName} WHERE ${idField} = ?`,
      [thread.other_participant_id]
    );
    
    thread.other_participant_name = users.length > 0 ? users[0].name : 'Unknown User';
    
    res.render('messages/thread', {
      title: thread.subject || 'Conversation with ' + thread.other_participant_name,
      thread,
      messages,
      userId,
      userType
    });
  } catch (err) {
    console.error('Error getting thread messages:', err);
    res.status(500).render('error', {
      message: 'Failed to load messages',
      error: err
    });
  }
});

// Show new message form
router.get('/new', isAuthenticated, async (req, res) => {
  try {
    const userType = req.session.userType;
    let recipients = [];
    
    // If recipient info is provided in query params, pre-select them
    const recipientId = req.query.to_id;
    const recipientType = req.query.to_type;
    const rideId = req.query.ride_id;
    let selectedRecipient = null;
    
    if (recipientId && recipientType) {
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
      }
    }
    
    // If we need to show a dropdown of possible recipients
    if (!selectedRecipient) {
      // Depends on the user type. Passengers can message drivers and admins,
      // drivers can message passengers and admins, admins can message everyone
      
      if (userType === 'passenger') {
        // Get drivers and admins
        const [drivers] = await db.query('SELECT driver_id as id, name, "driver" as type FROM driver');
        const [admins] = await db.query('SELECT admin_id as id, name, "admin" as type FROM admin');
        recipients = [...drivers, ...admins];
      } else if (userType === 'driver') {
        // Get passengers and admins
        const [passengers] = await db.query('SELECT passenger_id as id, name, "passenger" as type FROM passenger');
        const [admins] = await db.query('SELECT admin_id as id, name, "admin" as type FROM admin');
        recipients = [...passengers, ...admins];
      } else if (userType === 'admin') {
        // Get everyone
        const [passengers] = await db.query('SELECT passenger_id as id, name, "passenger" as type FROM passenger');
        const [drivers] = await db.query('SELECT driver_id as id, name, "driver" as type FROM driver');
        const [admins] = await db.query('SELECT admin_id as id, name, "admin" as type FROM admin WHERE admin_id != ?', [req.session.userId]);
        recipients = [...passengers, ...drivers, ...admins];
      }
    }
    
    // If rideId is provided, get ride details
    let ride = null;
    
    if (rideId) {
      const [rides] = await db.query('SELECT * FROM ride WHERE ride_id = ?', [rideId]);
      if (rides.length > 0) {
        ride = rides[0];
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
      error: 'Server error'
    });
  }
});

// Reply to a message in a thread
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
    
    // Get thread information
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
      thread.subject,
      content,
      null
    );
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Reply sent successfully'
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
      error: 'Server error'
    });
  }
});

// Get unread message count
router.get('/unread-count', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userType = req.session.userType;
    
    const count = await messageService.getUnreadMessageCount(userId, userType);
    
    res.json({
      success: true,
      count
    });
  } catch (err) {
    console.error('Error getting unread count:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router; 