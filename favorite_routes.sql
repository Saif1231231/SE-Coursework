-- Create the favorite_routes table if it doesn't exist
CREATE TABLE IF NOT EXISTS `favorite_routes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `passenger_id` INT NOT NULL,
  `pickup_location` VARCHAR(255) NOT NULL,
  `dropoff_location` VARCHAR(255) NOT NULL, 
  `note` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_used` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_favorite_passenger_idx` (`passenger_id` ASC),
  CONSTRAINT `fk_favorite_passenger`
    FOREIGN KEY (`passenger_id`)
    REFERENCES `passenger` (`passenger_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add some sample favorite routes (for testing only)
INSERT INTO `favorite_routes` (`passenger_id`, `pickup_location`, `dropoff_location`, `note`, `created_at`, `last_used`) VALUES
(1, 'University Campus', 'City Center', 'Daily commute', NOW(), NOW()),
(1, 'Home', 'University Library', 'Study sessions', NOW(), NOW()),
(1, 'Gym', 'Shopping Mall', 'Weekend routine', NOW(), NOW()); 