const db = require('./db');

/**
 * Send a message from one user to another
 * @param {number} senderId - The ID of the sender
 * @param {string} senderType - The type of the sender (passenger, driver, admin)
 * @param {number} recipientId - The ID of the recipient
 * @param {string} recipientType - The type of the recipient (passenger, driver, admin)
 * @param {string} subject - The subject of the message
 * @param {string} content - The content of the message
 * @param {number|null} rideId - Optional ride ID associated with this message
 * @returns {Promise<Object>} The result with the message ID
 */
async function sendMessage(senderId, senderType, recipientId, recipientType, subject, content, rideId = null) {
  try {
    const [results] = await db.query(
      'CALL send_message(?, ?, ?, ?, ?, ?, ?)',
      [senderId, senderType, recipientId, recipientType, subject, content, rideId]
    );
    
    return {
      success: true,
      messageId: results[0][0].message_id
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all message threads for a user
 * @param {number} userId - The user ID
 * @param {string} userType - The user type (passenger, driver, admin)
 * @returns {Promise<Array>} Array of message threads
 */
async function getMessageThreads(userId, userType) {
  try {
    const [threads] = await db.query(`
      SELECT 
        mt.thread_id,
        mt.subject,
        mt.updated_at,
        
        -- Participant info
        CASE 
          WHEN mt.participant1_id = ? AND mt.participant1_type = ? THEN mt.participant2_id
          ELSE mt.participant1_id
        END AS other_participant_id,
        
        CASE 
          WHEN mt.participant1_id = ? AND mt.participant1_type = ? THEN mt.participant2_type
          ELSE mt.participant1_type
        END AS other_participant_type,
        
        -- Last message preview
        SUBSTRING(m.content, 1, 100) AS last_message_preview,
        m.sender_id = ? AND m.sender_type = ? AS is_sender,
        m.sent_at,
        
        -- Count unread messages
        (
          SELECT COUNT(*) 
          FROM message 
          WHERE thread_id = mt.thread_id 
          AND recipient_id = ? 
          AND recipient_type = ? 
          AND is_read = FALSE
        ) AS unread_count
      FROM message_thread mt
      LEFT JOIN message m ON mt.last_message_id = m.message_id
      WHERE 
        (mt.participant1_id = ? AND mt.participant1_type = ?) OR
        (mt.participant2_id = ? AND mt.participant2_type = ?)
      ORDER BY mt.updated_at DESC
    `, [userId, userType, userId, userType, userId, userType, userId, userType, userId, userType, userId, userType]);
    
    // Get the names of the other participants
    for (const thread of threads) {
      let tableName;
      let idField;
      
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
      
      if (users.length > 0) {
        thread.other_participant_name = users[0].name;
      } else {
        thread.other_participant_name = 'Unknown User';
      }
    }
    
    return threads;
  } catch (error) {
    console.error('Error getting message threads:', error);
    throw error;
  }
}

/**
 * Get messages in a thread
 * @param {number} threadId - The thread ID
 * @param {number} userId - The user ID
 * @param {string} userType - The user type (passenger, driver, admin)
 * @returns {Promise<Array>} Array of messages
 */
async function getThreadMessages(threadId, userId, userType) {
  try {
    // First, verify that the user is a participant in this thread
    const [threads] = await db.query(`
      SELECT thread_id FROM message_thread
      WHERE thread_id = ? AND (
        (participant1_id = ? AND participant1_type = ?) OR
        (participant2_id = ? AND participant2_type = ?)
      )
    `, [threadId, userId, userType, userId, userType]);
    
    if (threads.length === 0) {
      throw new Error('User is not a participant in this thread');
    }
    
    // Get the messages
    const [messages] = await db.query(`
      SELECT 
        m.message_id,
        m.sender_id,
        m.sender_type,
        m.recipient_id,
        m.recipient_type,
        m.subject,
        m.content,
        m.is_read,
        m.sent_at,
        m.ride_id,
        m.sender_id = ? AND m.sender_type = ? AS is_sender
      FROM message m
      WHERE m.thread_id = ?
      ORDER BY m.sent_at ASC
    `, [userId, userType, threadId]);
    
    // Mark all messages as read if the user is the recipient
    await db.query(
      'CALL mark_thread_read(?, ?, ?)',
      [threadId, userId, userType]
    );
    
    return messages;
  } catch (error) {
    console.error('Error getting thread messages:', error);
    throw error;
  }
}

/**
 * Get the count of unread messages for a user
 * @param {number} userId - The user ID
 * @param {string} userType - The user type (passenger, driver, admin)
 * @returns {Promise<number>} The count of unread messages
 */
async function getUnreadMessageCount(userId, userType) {
  try {
    const [results] = await db.query(
      'CALL get_unread_message_count(?, ?)',
      [userId, userType]
    );
    
    return results[0][0].unread_count;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    return 0;
  }
}

module.exports = {
  sendMessage,
  getMessageThreads,
  getThreadMessages,
  getUnreadMessageCount
}; 