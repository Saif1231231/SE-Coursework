CREATE DATABASE IF NOT EXISTS ridesharing;
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clear existing data
TRUNCATE TABLE admin;
TRUNCATE TABLE passenger;
TRUNCATE TABLE driver;

-- Insert sample data
INSERT INTO admin (name, email, password_hash) VALUES
('Admin One', 'admin1@example.com', 'hashedpassword1');

INSERT INTO passenger (name, email, phone, password_hash) VALUES
('Harry Kane', 'harry.kane@example.com', '07123456789', 'hashedpassword3');

INSERT INTO driver (name, email, phone, password_hash, license_number, vehicle_details, rating) VALUES
('Lewis Hamilton', 'lewis.hamilton@example.com', '07123456781', 'hashedpassword5', 'LH12345', 'Mercedes-Benz', 4.9); 