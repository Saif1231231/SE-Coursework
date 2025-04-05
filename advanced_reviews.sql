-- Advanced Review System and Reporting SQL

USE ridesharing;

-- Add a status column to reviews to support moderation
ALTER TABLE review ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved';

-- Add a helpfulness tracking system to reviews
ALTER TABLE review ADD COLUMN helpful_count INT DEFAULT 0;
ALTER TABLE review ADD COLUMN unhelpful_count INT DEFAULT 0;

-- Create a table to track who found reviews helpful/unhelpful
CREATE TABLE IF NOT EXISTS review_feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    user_id INT NOT NULL,
    user_type ENUM('passenger', 'driver', 'admin') NOT NULL,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES review(review_id) ON DELETE CASCADE,
    CONSTRAINT unique_feedback UNIQUE (review_id, user_id, user_type)
);

-- Create a table for user reports
CREATE TABLE IF NOT EXISTS user_report (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT NOT NULL,
    reporter_type ENUM('passenger', 'driver', 'admin') NOT NULL,
    reported_id INT NOT NULL,
    reported_type ENUM('passenger', 'driver') NOT NULL,
    reason ENUM('inappropriate_behavior', 'safety_concern', 'fraud', 'discrimination', 'harassment', 'other') NOT NULL,
    description TEXT,
    status ENUM('pending', 'investigating', 'resolved', 'dismissed') DEFAULT 'pending',
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL
);

-- Create a table for review reports
CREATE TABLE IF NOT EXISTS review_report (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    reporter_id INT NOT NULL,
    reporter_type ENUM('passenger', 'driver', 'admin') NOT NULL,
    reason ENUM('inappropriate', 'false_information', 'spam', 'offensive', 'other') NOT NULL,
    description TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (review_id) REFERENCES review(review_id) ON DELETE CASCADE
);

-- Add triggers to update driver ratings automatically
DELIMITER //
CREATE TRIGGER update_driver_rating_after_review
AFTER INSERT ON review
FOR EACH ROW
BEGIN
    UPDATE driver d
    SET d.rating = (
        SELECT AVG(r.rating)
        FROM review r
        WHERE r.driver_id = NEW.driver_id
        AND r.status = 'approved'
    )
    WHERE d.driver_id = NEW.driver_id;
END //

CREATE TRIGGER update_driver_rating_after_review_update
AFTER UPDATE ON review
FOR EACH ROW
BEGIN
    UPDATE driver d
    SET d.rating = (
        SELECT AVG(r.rating)
        FROM review r
        WHERE r.driver_id = NEW.driver_id
        AND r.status = 'approved'
    )
    WHERE d.driver_id = NEW.driver_id;
END //
DELIMITER ;

-- Add indexes for performance
CREATE INDEX idx_review_status ON review(status);
CREATE INDEX idx_review_driver_id ON review(driver_id);
CREATE INDEX idx_user_report_status ON user_report(status);
CREATE INDEX idx_review_report_status ON review_report(status);

-- Insert some sample data
INSERT INTO user_report (reporter_id, reporter_type, reported_id, reported_type, reason, description, status)
VALUES 
(1, 'passenger', 3, 'driver', 'safety_concern', 'Driver was speeding and ignoring traffic signals', 'pending'),
(2, 'passenger', 1, 'driver', 'inappropriate_behavior', 'Driver was rude and made inappropriate comments', 'pending'),
(3, 'driver', 2, 'passenger', 'harassment', 'Passenger was verbally abusive during the ride', 'investigating');

-- Insert sample review reports
INSERT INTO review_report (review_id, reporter_id, reporter_type, reason, description, status)
VALUES 
(1, 3, 'driver', 'false_information', 'This review contains false accusations about the ride', 'pending'),
(2, 4, 'passenger', 'inappropriate', 'Review contains offensive language', 'pending'); 