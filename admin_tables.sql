USE ridesharing;

-- Adding the verified column to passenger table
ALTER TABLE passenger
ADD COLUMN verified BOOLEAN DEFAULT FALSE;

-- Adding the verified column to driver table
ALTER TABLE driver
ADD COLUMN verified BOOLEAN DEFAULT FALSE;

-- Adding the suspended column to passenger table
ALTER TABLE passenger
ADD COLUMN suspended BOOLEAN DEFAULT FALSE;

-- Adding the suspended column to driver table
ALTER TABLE driver
ADD COLUMN suspended BOOLEAN DEFAULT FALSE;

-- Creating the dispute table
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

-- Adding some sample data
UPDATE passenger SET verified = TRUE WHERE passenger_id IN (1, 2);
UPDATE driver SET verified = TRUE WHERE driver_id IN (1, 2);

-- Adding a sample dispute
INSERT INTO dispute (ride_id, passenger_id, driver_id, description, status)
SELECT 
    r.ride_id,
    r.passenger_id,
    r.driver_id,
    'The driver is late by 30 minutes',
    'pending'
FROM ride r
WHERE r.status = 'The ride has been completed'
LIMIT 1; 