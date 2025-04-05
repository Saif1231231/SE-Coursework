USE ridesharing;

-- Create Report Categories Table
CREATE TABLE IF NOT EXISTS report_category (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Driver Report Table
CREATE TABLE IF NOT EXISTS driver_report (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    passenger_id INT NOT NULL,
    driver_id INT NOT NULL,
    ride_id INT,
    category_id INT,
    report_title VARCHAR(255) NOT NULL,
    report_description TEXT NOT NULL,
    supporting_evidence TEXT,
    status ENUM('pending', 'under_review', 'resolved', 'dismissed') DEFAULT 'pending',
    admin_notes TEXT,
    resolution_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (passenger_id) REFERENCES passenger(passenger_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES ride(ride_id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES report_category(category_id) ON DELETE SET NULL
);

-- Create Report Comments Table
CREATE TABLE IF NOT EXISTS report_comment (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    user_id INT NOT NULL,
    user_type ENUM('passenger', 'driver', 'admin') NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES driver_report(report_id) ON DELETE CASCADE
);

-- Create Report Evidence Table (for file uploads)
CREATE TABLE IF NOT EXISTS report_evidence (
    evidence_id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES driver_report(report_id) ON DELETE CASCADE
);

-- Insert Report Categories
INSERT INTO report_category (name, description) VALUES
('Late Pickup', 'Driver was excessively late for scheduled pickup'),
('Unsafe Driving', 'Driver engaged in dangerous or reckless driving'),
('Unprofessional Behavior', 'Driver was rude, disrespectful, or exhibited inappropriate behavior'),
('Vehicle Condition', 'Vehicle was unclean, damaged, or in poor condition'),
('Route Deviation', 'Driver took unnecessarily long or incorrect routes'),
('Cancellation Issues', 'Last-minute cancellations or other booking problems'),
('Payment Disputes', 'Disagreements over fare or payment issues'),
('Personal Safety Concerns', 'Situations that made passenger feel unsafe or uncomfortable'),
('Other', 'Other issues not covered by the above categories'); 