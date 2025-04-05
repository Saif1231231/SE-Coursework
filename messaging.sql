-- Messaging System Tables
USE ridesharing;

-- Message Thread Table
CREATE TABLE IF NOT EXISTS message_thread (
    thread_id INT AUTO_INCREMENT PRIMARY KEY,
    participant1_id INT NOT NULL,
    participant1_type ENUM('passenger', 'driver', 'admin') NOT NULL,
    participant2_id INT NOT NULL,
    participant2_type ENUM('passenger', 'driver', 'admin') NOT NULL,
    subject VARCHAR(255),
    last_message_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ride_id INT NULL,
    UNIQUE KEY unique_participants (participant1_id, participant1_type, participant2_id, participant2_type),
    KEY idx_participant1 (participant1_id, participant1_type),
    KEY idx_participant2 (participant2_id, participant2_type),
    INDEX idx_ride (ride_id)
);

-- Message Table
CREATE TABLE IF NOT EXISTS message (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    thread_id INT NOT NULL,
    sender_id INT NOT NULL,
    sender_type ENUM('passenger', 'driver', 'admin') NOT NULL,
    recipient_id INT NOT NULL,
    recipient_type ENUM('passenger', 'driver', 'admin') NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ride_id INT NULL,
    FOREIGN KEY (thread_id) REFERENCES message_thread(thread_id) ON DELETE CASCADE,
    INDEX idx_thread (thread_id),
    INDEX idx_sender (sender_id, sender_type),
    INDEX idx_recipient (recipient_id, recipient_type),
    INDEX idx_ride (ride_id)
);

-- Stored procedures for messaging operations

-- Send Message Procedure
DELIMITER //
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
    DECLARE thread_exists INT DEFAULT 0;
    DECLARE v_thread_id INT;
    DECLARE v_message_id INT;
    
    -- Check if thread already exists between these users
    SELECT 
        thread_id INTO v_thread_id 
    FROM 
        message_thread 
    WHERE 
        (participant1_id = p_sender_id AND participant1_type = p_sender_type AND 
         participant2_id = p_recipient_id AND participant2_type = p_recipient_type)
        OR
        (participant1_id = p_recipient_id AND participant1_type = p_recipient_type AND
         participant2_id = p_sender_id AND participant2_type = p_sender_type)
    LIMIT 1;
    
    -- Create thread if it doesn't exist
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
    
    -- Update the thread with the last message id
    UPDATE message_thread 
    SET last_message_id = v_message_id, 
        subject = p_subject
    WHERE thread_id = v_thread_id;
    
    -- Return the result
    SELECT v_message_id AS message_id, v_thread_id AS thread_id;
END//
DELIMITER ;

-- Mark Thread as Read procedure
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS mark_thread_read(
    IN p_thread_id INT,
    IN p_user_id INT,
    IN p_user_type VARCHAR(20)
)
BEGIN
    UPDATE message
    SET is_read = TRUE
    WHERE 
        thread_id = p_thread_id AND 
        recipient_id = p_user_id AND 
        recipient_type = p_user_type AND
        is_read = FALSE;
END//
DELIMITER ;

-- Get Unread Message Count procedure
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS get_unread_message_count(
    IN p_user_id INT,
    IN p_user_type VARCHAR(20)
)
BEGIN
    SELECT COUNT(*) AS unread_count
    FROM message
    WHERE 
        recipient_id = p_user_id AND 
        recipient_type = p_user_type AND
        is_read = FALSE;
END//
DELIMITER ;

-- Add some sample messages between Marcus Rashford (passenger) and Lewis Hamilton (driver)
-- First, check if they exist and get their IDs
SELECT passenger_id INTO @passenger_id FROM passenger WHERE name = 'Marcus Rashford' LIMIT 1;
SELECT driver_id INTO @driver_id FROM driver WHERE name = 'Lewis Hamilton' LIMIT 1;

-- If they both exist, insert a sample conversation
INSERT INTO message_thread (participant1_id, participant1_type, participant2_id, participant2_type, subject)
VALUES (@passenger_id, 'passenger', @driver_id, 'driver', 'Ride to the University');

SET @thread_id = LAST_INSERT_ID();

-- Insert messages
INSERT INTO message (thread_id, sender_id, sender_type, recipient_id, recipient_type, subject, content, is_read)
VALUES 
    (@thread_id, @passenger_id, 'passenger', @driver_id, 'driver', 'Ride to the University', 'Hi Lewis, are you available to drive me to the university tomorrow?', true),
    (@thread_id, @driver_id, 'driver', @passenger_id, 'passenger', 'Ride to the University', 'Hi Marcus, yes I am available. What time do you need to be there?', true),
    (@thread_id, @passenger_id, 'passenger', @driver_id, 'driver', 'Ride to the University', 'Great! I need to be there by 9am.', true),
    (@thread_id, @driver_id, 'driver', @passenger_id, 'passenger', 'Ride to the University', 'Perfect, I can pick you up at 8:30am. Does that work for you?', false);

-- Update the last message id in the thread
SET @last_message_id = LAST_INSERT_ID();
UPDATE message_thread SET last_message_id = @last_message_id WHERE thread_id = @thread_id; 