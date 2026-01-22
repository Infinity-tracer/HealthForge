-- Migration: Add email_verifications table
-- Run this script in MySQL to add email verification support

USE medical_reports_db;

-- Email verification codes table
CREATE TABLE IF NOT EXISTS email_verifications (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    verification_code VARCHAR(6) NOT NULL,
    pin VARCHAR(255) NOT NULL,  -- Temporarily store hashed PIN during verification
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(10) NOT NULL,
    date_of_birth DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    
    INDEX idx_email_verification (email),
    INDEX idx_verification_code (verification_code),
    INDEX idx_expires_at (expires_at)
);

-- Optional: Create event to auto-cleanup expired verifications (run once)
-- Note: Make sure event_scheduler is ON in MySQL: SET GLOBAL event_scheduler = ON;
DELIMITER //
CREATE EVENT IF NOT EXISTS cleanup_expired_verifications
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
    DELETE FROM email_verifications 
    WHERE expires_at < NOW() OR (verified = TRUE AND created_at < DATE_SUB(NOW(), INTERVAL 1 DAY));
END//
DELIMITER ;
