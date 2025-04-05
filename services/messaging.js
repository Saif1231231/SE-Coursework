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
 * @returns {Promise<Object>} The result with the thread ID and message ID
 */
async function sendMessage(senderId, senderType, recipientId, recipientType, subject, content, rideId = null) {
  try {
    // Call the stored procedure to send the message
    const [results] = await db.query(
      'CALL send_message(?, ?, ?, ?, ?, ?, ?)',
      [senderId, senderType, recipientId, recipientType, subject, content, rideId]
    );
    
    return {
      success: true,
      messageId: results[0][0].message_id,
      threadId: results[0][0].thread_id
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
        mt.ride_id,
        
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
    
    // For each message, get the sender's name
    for (const message of messages) {
      let tableName;
      let idField;
      
      if (message.sender_type === 'passenger') {
        tableName = 'passenger';
        idField = 'passenger_id';
      } else if (message.sender_type === 'driver') {
        tableName = 'driver';
        idField = 'driver_id';
      } else if (message.sender_type === 'admin') {
        tableName = 'admin';
        idField = 'admin_id';
      }
      
      const [users] = await db.query(
        `SELECT name FROM ${tableName} WHERE ${idField} = ?`,
        [message.sender_id]
      );
      
      if (users.length > 0) {
        message.sender_name = users[0].name;
      } else {
        message.sender_name = 'Unknown User';
      }
    }
    
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

/**
 * Get all available users for messaging
 * @param {string} userType - The type of the current user
 * @param {number} userId - The ID of the current user
 * @returns {Promise<Array>} Array of available users
 */
async function getAvailableUsers(userType, userId) {
  try {
    let results = [];
    
    // Based on user type, get the appropriate users they can message
    if (userType === 'passenger') {
      // Passengers can message all drivers and admins
      const [drivers] = await db.query(`
        SELECT driver_id AS id, name, 'driver' AS type, email
        FROM driver
        ORDER BY name
      `);
      
      const [admins] = await db.query(`
        SELECT admin_id AS id, name, 'admin' AS type, email
        FROM admin
        ORDER BY name
      `);
      
      results = [...drivers, ...admins];
    } 
    else if (userType === 'driver') {
      // Drivers can message all passengers and admins
      const [passengers] = await db.query(`
        SELECT passenger_id AS id, name, 'passenger' AS type, email
        FROM passenger
        ORDER BY name
      `);
      
      const [admins] = await db.query(`
        SELECT admin_id AS id, name, 'admin' AS type, email
        FROM admin
        ORDER BY name
      `);
      
      results = [...passengers, ...admins];
    }
    else if (userType === 'admin') {
      // Admins can message everyone
      const [passengers] = await db.query(`
        SELECT passenger_id AS id, name, 'passenger' AS type, email
        FROM passenger
        ORDER BY name
      `);
      
      const [drivers] = await db.query(`
        SELECT driver_id AS id, name, 'driver' AS type, email
        FROM driver
        ORDER BY name
      `);
      
      const [admins] = await db.query(`
        SELECT admin_id AS id, name, 'admin' AS type, email
        FROM admin
        WHERE admin_id != ?
        ORDER BY name
      `, [userId]);
      
      results = [...passengers, ...drivers, ...admins];
    }
    
    console.log(`Available users for ${userType} ${userId}:`, results.length);
    return results;
  } catch (error) {
    console.error('Error getting available users:', error);
    throw error;
  }
}

/**
 * Ensure that the required database tables and procedures exist
 * @returns {Promise<void>}
 */
async function ensureMessagingTablesExist() {
  try {
    console.log('Checking if messaging tables exist...');

    // Check if message_thread table exists
    const [threadTableExists] = await db.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'message_thread'
    `);

    // Check if message table exists
    const [messageTableExists] = await db.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'message'
    `);

    // If tables don't exist, create them
    if (threadTableExists[0].count === 0 || messageTableExists[0].count === 0) {
      console.log('Creating messaging tables...');

      // Create message_thread table
      if (threadTableExists[0].count === 0) {
        await db.query(`
          CREATE TABLE message_thread (
            thread_id INT AUTO_INCREMENT PRIMARY KEY,
            participant1_id INT NOT NULL,
            participant1_type VARCHAR(20) NOT NULL,
            participant2_id INT NOT NULL,
            participant2_type VARCHAR(20) NOT NULL,
            subject VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            ride_id INT,
            last_message_id INT
          )
        `);
        console.log('Created message_thread table');
      }

      // Create message table
      if (messageTableExists[0].count === 0) {
        await db.query(`
          CREATE TABLE message (
            message_id INT AUTO_INCREMENT PRIMARY KEY,
            thread_id INT NOT NULL,
            sender_id INT NOT NULL,
            sender_type VARCHAR(20) NOT NULL,
            recipient_id INT NOT NULL,
            recipient_type VARCHAR(20) NOT NULL,
            subject VARCHAR(255),
            content TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ride_id INT,
            FOREIGN KEY (thread_id) REFERENCES message_thread(thread_id) ON DELETE CASCADE
          )
        `);
        console.log('Created message table');
      }

      // Create stored procedures
      await db.query(`
        CREATE PROCEDURE IF NOT EXISTS send_message(
          IN p_sender_id INT,
          IN p_sender_type VARCHAR(20),
          IN p_recipient_id INT,
          IN p_recipient_type VARCHAR(20),
          IN p_subject VARCHAR(255),
          IN p_content TEXT,
          IN p_ride_id INT
        )
        BEGIN
          DECLARE v_thread_id INT;
          DECLARE v_message_id INT;
          
          -- Check if a thread already exists between these users
          SELECT thread_id INTO v_thread_id FROM message_thread
          WHERE (
            (participant1_id = p_sender_id AND participant1_type = p_sender_type AND 
             participant2_id = p_recipient_id AND participant2_type = p_recipient_type)
            OR
            (participant1_id = p_recipient_id AND participant1_type = p_recipient_type AND 
             participant2_id = p_sender_id AND participant2_type = p_sender_type)
          )
          LIMIT 1;
          
          -- If thread doesn't exist, create it
          IF v_thread_id IS NULL THEN
            INSERT INTO message_thread (
              participant1_id, participant1_type, 
              participant2_id, participant2_type,
              subject, ride_id
            ) VALUES (
              p_sender_id, p_sender_type,
              p_recipient_id, p_recipient_type,
              p_subject, p_ride_id
            );
            
            SET v_thread_id = LAST_INSERT_ID();
          END IF;
          
          -- Insert the message
          INSERT INTO message (
            thread_id, sender_id, sender_type, 
            recipient_id, recipient_type,
            subject, content, ride_id
          ) VALUES (
            v_thread_id, p_sender_id, p_sender_type,
            p_recipient_id, p_recipient_type,
            p_subject, p_content, p_ride_id
          );
          
          SET v_message_id = LAST_INSERT_ID();
          
          -- Update thread's last_message_id
          UPDATE message_thread SET last_message_id = v_message_id 
          WHERE thread_id = v_thread_id;
          
          -- Return the IDs
          SELECT v_message_id AS message_id, v_thread_id AS thread_id;
        END
      `);
      
      await db.query(`
        CREATE PROCEDURE IF NOT EXISTS mark_thread_read(
          IN p_thread_id INT,
          IN p_user_id INT,
          IN p_user_type VARCHAR(20)
        )
        BEGIN
          UPDATE message 
          SET is_read = TRUE 
          WHERE thread_id = p_thread_id 
            AND recipient_id = p_user_id 
            AND recipient_type = p_user_type 
            AND is_read = FALSE;
        END
      `);
      
      await db.query(`
        CREATE PROCEDURE IF NOT EXISTS get_unread_message_count(
          IN p_user_id INT,
          IN p_user_type VARCHAR(20)
        )
        BEGIN
          SELECT COUNT(*) AS unread_count 
          FROM message 
          WHERE recipient_id = p_user_id 
            AND recipient_type = p_user_type 
            AND is_read = FALSE;
        END
      `);
      
      console.log('Created messaging stored procedures');
    } else {
      console.log('Messaging tables already exist');
    }
  } catch (error) {
    console.error('Error setting up messaging tables:', error);
    throw error;
  }
}

// Export the module
module.exports = {
  sendMessage,
  getMessageThreads,
  getThreadMessages,
  getUnreadMessageCount,
  getAvailableUsers,
  ensureMessagingTablesExist
}; 