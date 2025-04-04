-- Drop database if exists and create new one
DROP DATABASE IF EXISTS ridesharing;
CREATE DATABASE ridesharing;
USE ridesharing;

-- Admin Table
CREATE TABLE IF NOT EXISTS admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Passenger Table
CREATE TABLE IF NOT EXISTS passenger (
    passenger_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    suspended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Driver Table
CREATE TABLE IF NOT EXISTS driver (
    driver_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_details VARCHAR(255),
    rating DECIMAL(3,2) DEFAULT 0.00,
    verified BOOLEAN DEFAULT FALSE,
    suspended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ride Table
CREATE TABLE IF NOT EXISTS ride (
    ride_id INT AUTO_INCREMENT PRIMARY KEY,
    passenger_id INT,
    driver_id INT,
    pickup_location VARCHAR(255) NOT NULL,
    dropoff_location VARCHAR(255) NOT NULL,
    departureTime DATETIME NOT NULL,
    fare DECIMAL(10,2) NOT NULL,
    status ENUM('requested', 'accepted', 'completed', 'cancelled') NOT NULL DEFAULT 'requested',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    seatsAvailable INT NOT NULL DEFAULT 4,
    FOREIGN KEY (passenger_id) REFERENCES passenger(passenger_id) ON DELETE SET NULL,
    FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE SET NULL
);

-- Booking Table
CREATE TABLE IF NOT EXISTS booking (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    passenger_id INT NOT NULL,
    driver_id INT,
    ride_id INT NOT NULL,
    booking_status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (passenger_id) REFERENCES passenger(passenger_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE SET NULL,
    FOREIGN KEY (ride_id) REFERENCES ride(ride_id) ON DELETE CASCADE
);

-- Payment Table
CREATE TABLE payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL,
    passenger_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'card', 'wallet') NOT NULL,
    status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES ride(ride_id) ON DELETE CASCADE,
    FOREIGN KEY (passenger_id) REFERENCES passenger(passenger_id) ON DELETE CASCADE
);

-- Transaction Table
CREATE TABLE transaction (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    transaction_reference VARCHAR(100) UNIQUE NOT NULL,
    status ENUM('success', 'failed', 'pending') NOT NULL DEFAULT 'pending',
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payment(payment_id) ON DELETE CASCADE
);

-- Review Table
CREATE TABLE IF NOT EXISTS review (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL,
    passenger_id INT NOT NULL,
    driver_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES ride(ride_id) ON DELETE CASCADE,
    FOREIGN KEY (passenger_id) REFERENCES passenger(passenger_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE CASCADE
);

-- Notification Table
CREATE TABLE notification (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_type ENUM('passenger', 'driver', 'admin') NOT NULL,
    message TEXT NOT NULL,
    status ENUM('unread', 'read') DEFAULT 'unread',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dispute Table
CREATE TABLE IF NOT EXISTS dispute (
    dispute_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL,
    passenger_id INT NOT NULL,
    driver_id INT NOT NULL,
    description TEXT NOT NULL,
    status ENUM('pending', 'resolved') DEFAULT 'pending',
    resolution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES ride(ride_id) ON DELETE CASCADE,
    FOREIGN KEY (passenger_id) REFERENCES passenger(passenger_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE CASCADE
);

-- First, clear existing data
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE review;
TRUNCATE TABLE booking;
TRUNCATE TABLE ride;
TRUNCATE TABLE passenger;
TRUNCATE TABLE driver;
TRUNCATE TABLE admin;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert admin (password: test123)
INSERT INTO admin (name, email, password_hash) VALUES
('Admin One', 'admin1@example.com', 'test123');

-- Insert passengers (students) (password: test123)
INSERT INTO passenger (name, email, phone, password_hash, verified) VALUES
('Marcus Rashford', 'rashford@student.com', '07123456789', 'test123', TRUE),
('Harry Kane', 'kane@student.com', '07987654321', 'test123', TRUE),
('Jack Grealish', 'grealish@student.com', '07111222333', 'test123', FALSE),
('Bukayo Saka', 'saka@student.com', '07444555666', 'test123', FALSE);

-- Insert drivers (password: test123)
INSERT INTO driver (name, email, phone, password_hash, license_number, vehicle_details, rating, verified) VALUES
('Lewis Hamilton', 'hamilton@f1.com', '07100100100', 'test123', 'F1-HAM-44', 'Mercedes AMG GT - Silver', 4.9, TRUE),
('Max Verstappen', 'verstappen@f1.com', '07200200200', 'test123', 'F1-VER-33', 'Red Bull RB16B - Blue', 4.8, TRUE),
('Lando Norris', 'norris@f1.com', '07300300300', 'test123', 'F1-NOR-04', 'McLaren MCL35M - Orange', 4.7, FALSE),
('George Russell', 'russell@f1.com', '07400400400', 'test123', 'F1-RUS-63', 'Mercedes AMG GT - Black', 4.8, FALSE);

-- Insert sample rides
INSERT INTO ride (driver_id, pickup_location, dropoff_location, departureTime, fare, status, seatsAvailable) VALUES
(NULL, 'Roehampton University', 'Putney', DATE_ADD(NOW(), INTERVAL 1 DAY), 45.00, 'requested', 4),
(NULL, 'Putney', 'Roehampton University', DATE_ADD(NOW(), INTERVAL 2 DAY), 35.00, 'requested', 3),
(3, 'Roehampton University', 'Croydon', DATE_ADD(NOW(), INTERVAL 1 DAY), 25.00, 'accepted', 4),
(4, 'Clapham Junction', 'Roehampton University', DATE_ADD(NOW(), INTERVAL 3 DAY), 20.00, 'accepted', 3),
(NULL, 'Roehampton University', 'Norbury', DATE_ADD(NOW(), INTERVAL 2 DAY), 30.00, 'requested', 4),
(2, 'Wandsworth Common', 'Roehampton University', DATE_ADD(NOW(), INTERVAL 1 DAY), 28.00, 'accepted', 3),
(NULL, 'Roehampton University', 'Putney Bridge', DATE_ADD(NOW(), INTERVAL 2 DAY), 15.00, 'requested', 4),
(4, 'Wimbledon', 'Roehampton University', DATE_ADD(NOW(), INTERVAL 1 DAY), 12.00, 'accepted', 3),
(NULL, 'Roehampton University', 'Balham', DATE_ADD(NOW(), INTERVAL 3 DAY), 25.00, 'requested', 4),
(2, 'East Croydon', 'Roehampton University', DATE_ADD(NOW(), INTERVAL 2 DAY), 22.00, 'accepted', 3);

-- Insert some completed rides with reviews
INSERT INTO ride (driver_id, passenger_id, pickup_location, dropoff_location, departureTime, fare, status, seatsAvailable) VALUES
(1, 1, 'Roehampton University', 'Mitcham Junction', DATE_SUB(NOW(), INTERVAL 1 DAY), 25.00, 'completed', 3),
(2, 2, 'London Waterloo', 'Roehampton University', DATE_SUB(NOW(), INTERVAL 2 DAY), 30.00, 'completed', 2);

-- Insert reviews for completed rides
INSERT INTO review (ride_id, passenger_id, driver_id, rating, comment) VALUES
(11, 1, 1, 5, 'Lewis was as fast as his F1 car! Great service.'),
(12, 2, 2, 5, 'Max got me to my destination in record time. Very professional.');

-- Insert sample bookings
INSERT INTO booking (passenger_id, driver_id, ride_id, booking_status) VALUES
(1, 1, 11, 'confirmed'),
(2, 2, 12, 'confirmed');

-- Insert sample dispute
INSERT INTO dispute (ride_id, passenger_id, driver_id, description, status) VALUES
(11, 1, 1, 'Driver was late by 30 minutes', 'pending');

-- Example queries
SELECT * FROM ride WHERE status = 'accepted' ORDER BY departureTime;
SELECT * FROM driver WHERE email = 'hamilton@f1.com';

USE ridesharing;
SELECT * FROM driver WHERE email = 'lewis.hamilton@example.com';

UPDATE driver 
SET password_hash = 'newpassword' 
WHERE email = 'lewis.hamilton@example.com'; 

SELECT email, password_hash FROM driver WHERE email = 'lewis.hamilton@example.com'; 