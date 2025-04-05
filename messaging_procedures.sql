-- Stored procedures for messaging operations
USE ridesharing;

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