-- Migration script to add fingerprint columns to existing patients table
-- Run this script if you have an existing database without fingerprint columns

USE medical_reports_db;

-- Add fingerprint columns to patients table
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS fingerprint_credential_id TEXT AFTER pin,
ADD COLUMN IF NOT EXISTS fingerprint_public_key TEXT AFTER fingerprint_credential_id,
ADD COLUMN IF NOT EXISTS fingerprint_registered BOOLEAN DEFAULT FALSE AFTER fingerprint_public_key;

-- For MySQL versions that don't support IF NOT EXISTS in ALTER TABLE, use this alternative:
-- First check if columns exist, then add them if they don't

-- Check and add fingerprint_credential_id
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'medical_reports_db' 
    AND TABLE_NAME = 'patients' 
    AND COLUMN_NAME = 'fingerprint_credential_id'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE patients ADD COLUMN fingerprint_credential_id TEXT AFTER pin', 
    'SELECT "fingerprint_credential_id already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add fingerprint_public_key
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'medical_reports_db' 
    AND TABLE_NAME = 'patients' 
    AND COLUMN_NAME = 'fingerprint_public_key'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE patients ADD COLUMN fingerprint_public_key TEXT AFTER fingerprint_credential_id', 
    'SELECT "fingerprint_public_key already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add fingerprint_registered
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'medical_reports_db' 
    AND TABLE_NAME = 'patients' 
    AND COLUMN_NAME = 'fingerprint_registered'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE patients ADD COLUMN fingerprint_registered BOOLEAN DEFAULT FALSE AFTER fingerprint_public_key', 
    'SELECT "fingerprint_registered already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the columns were added
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'medical_reports_db'
AND TABLE_NAME = 'patients'
AND COLUMN_NAME LIKE 'fingerprint%';
