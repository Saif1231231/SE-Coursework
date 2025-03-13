CREATE DATABASE IF NOT EXISTS ridesharing;
USE ridesharing;

-- Admin Table
CREATE TABLE admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Passenger Table
CREATE TABLE passenger (
    passenger_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Driver Table
CREATE TABLE driver (
    driver_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_details VARCHAR(255),
    rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ride Table
CREATE TABLE ride (
    ride_id INT AUTO_INCREMENT PRIMARY KEY,
    passenger_id INT,
    driver_id INT,
    pickup_location VARCHAR(255) NOT NULL,
    dropoff_location VARCHAR(255) NOT NULL,
    fare DECIMAL(10,2) NOT NULL,
    status ENUM('requested', 'accepted', 'completed', 'cancelled') NOT NULL DEFAULT 'requested',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    seatsAvailable INT DEFAULT 0,
    FOREIGN KEY (passenger_id) REFERENCES passenger(passenger_id) ON DELETE SET NULL,
    FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE SET NULL
);

-- Booking Table
CREATE TABLE booking (
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
CREATE TABLE review (
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

-- Insert into Admin Table
INSERT INTO admin (name, email, password_hash) VALUES
('Admin One', 'admin1@example.com', 'hashedpassword1'),
('Admin Two', 'admin2@example.com', 'hashedpassword2');

-- Insert into Passenger Table
INSERT INTO passenger (name, email, phone, password_hash) VALUES
('Harry Kane', 'harry.kane@example.com', '07123456789', 'hashedpassword3'),
('Raheem Sterling', 'raheem.sterling@example.com', '07123456780', 'hashedpassword4');

-- Insert into Driver Table
INSERT INTO driver (name, email, phone, password_hash, license_number, vehicle_details, rating) VALUES
('Lewis Hamilton', 'lewis.hamilton@example.com', '07123456781', 'hashedpassword5', 'LH12345', 'Mercedes-Benz', 4.9),
('Max Verstappen', 'max.verstappen@example.com', '07123456782', 'hashedpassword6', 'MV67890', 'Red Bull Racing', 4.8);

-- Insert into Ride Table
INSERT INTO ride (passenger_id, driver_id, pickup_location, dropoff_location, fare, status, created_at, seatsAvailable)
VALUES
(1, 1, 'Croydon', 'Norbury', 25.00, 'requested', NOW(), 3),
(2, 2, 'Streatham', 'Croydon', 30.00, 'accepted', NOW(), 2);

-- Insert into Booking Table
INSERT INTO booking (passenger_id, driver_id, ride_id, booking_status) VALUES
(1, 1, 1, 'confirmed'),
(2, 2, 2, 'confirmed');

-- Insert into Payment Table
INSERT INTO payment (ride_id, passenger_id, amount, payment_method, status) VALUES
(1, 1, 25.00, 'card', 'completed'),
(2, 2, 30.00, 'cash', 'completed');

-- Insert into Transaction Table
INSERT INTO transaction (payment_id, transaction_reference, status) VALUES
(1, 'TXN123456', 'success'),
(2, 'TXN654321', 'success');

-- Insert into Review Table
INSERT INTO review (ride_id, passenger_id, driver_id, rating, comment, created_at) VALUES
(1, 1, 1, 5, 'Excellent service! Lewis was very professional and the ride was smooth.', NOW()),
(2, 2, 2, 4, 'Great driver, comfortable ride. Would recommend!', NOW()),
(1, 2, 1, 5, 'Perfect timing and very friendly driver.', NOW()),
(2, 1, 2, 4, 'Good communication and safe driving.', NOW()),
(1, 1, 1, 5, 'Best ride experience ever!', NOW());

-- Insert into Notification Table
INSERT INTO notification (user_id, user_type, message, status) VALUES
(1, 'passenger', 'Your ride has been completed.', 'unread'),
(2, 'driver', 'You have a new booking.', 'unread');

ALTER TABLE ride ADD COLUMN seatsAvailable INT DEFAULT 0;

SELECT * FROM ride WHERE status IN ('requested', 'accepted', 'completed');

-- Example query to fetch available rides
SELECT * FROM ride
WHERE status = 'requested'
ORDER BY created_at DESC; 