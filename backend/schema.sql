-- Medical Reports Database Schema
-- Run this script in MySQL to create the required tables
-- This schema is shared between the Streamlit app and Flask API

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS medical_reports_db;
USE medical_reports_db;

-- Main table to store medical report summaries
CREATE TABLE IF NOT EXISTS medical_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Report identification
    report_id VARCHAR(50) UNIQUE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    
    -- Patient Information
    patient_name VARCHAR(100),
    patient_age INT,
    patient_gender ENUM('Male', 'Female', 'Other', 'Unknown') DEFAULT 'Unknown',
    patient_id VARCHAR(50),
    
    -- Report Details
    report_date DATE,
    report_type VARCHAR(100),  -- e.g., 'Blood Test', 'X-Ray', 'MRI', 'CT Scan', 'Pathology', etc.
    hospital_name VARCHAR(255),
    doctor_name VARCHAR(100),
    
    -- Medical Content
    summary TEXT,                    -- AI-generated summary of the report
    diagnosis TEXT,                  -- Main diagnosis findings
    key_findings TEXT,               -- Important findings/observations
    test_results TEXT,               -- Key test results (JSON format)
    recommendations TEXT,            -- Doctor's recommendations
    
    -- Raw text for reference
    raw_text LONGTEXT,               -- Full extracted text from PDF
    
    -- Metadata
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    processed_status ENUM('pending', 'processed', 'failed') DEFAULT 'pending',
    
    -- Vector store reference
    faiss_index_path VARCHAR(500),
    
    -- Indexes for faster queries
    INDEX idx_patient_name (patient_name),
    INDEX idx_report_date (report_date),
    INDEX idx_report_type (report_type),
    INDEX idx_upload_date (upload_date),
    INDEX idx_patient_id (patient_id)
);

-- Table to store individual test results (normalized structure)
CREATE TABLE IF NOT EXISTS test_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id VARCHAR(50) NOT NULL,
    test_name VARCHAR(100) NOT NULL,
    test_value VARCHAR(100),
    unit VARCHAR(50),
    normal_range VARCHAR(100),
    status ENUM('Normal', 'Abnormal', 'Critical', 'Unknown') DEFAULT 'Unknown',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (report_id) REFERENCES medical_reports(report_id) ON DELETE CASCADE,
    INDEX idx_test_name (test_name),
    INDEX idx_status (status)
);

-- Table to store chat/query history for each report
CREATE TABLE IF NOT EXISTS query_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id VARCHAR(50) NOT NULL,
    user_question TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    query_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (report_id) REFERENCES medical_reports(report_id) ON DELETE CASCADE,
    INDEX idx_query_time (query_time)
);

-- View for quick report summary
CREATE OR REPLACE VIEW report_summary_view AS
SELECT 
    mr.id,
    mr.report_id,
    mr.file_name,
    mr.patient_name,
    mr.patient_age,
    mr.patient_gender,
    mr.report_type,
    mr.report_date,
    mr.summary,
    mr.diagnosis,
    mr.upload_date,
    COUNT(tr.id) as total_tests,
    SUM(CASE WHEN tr.status = 'Abnormal' THEN 1 ELSE 0 END) as abnormal_tests
FROM medical_reports mr
LEFT JOIN test_results tr ON mr.report_id = tr.report_id
GROUP BY mr.id;

-- =========================================
-- USER AUTHENTICATION TABLES
-- =========================================

-- Patients table for login and registration
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(36) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(10) NOT NULL,
    date_of_birth DATE NOT NULL,
    pin VARCHAR(255) NOT NULL,  -- Hashed PIN for security
    fingerprint_credential_id TEXT,  -- WebAuthn credential ID (base64 encoded)
    fingerprint_public_key TEXT,     -- WebAuthn public key (base64 encoded)
    fingerprint_registered BOOLEAN DEFAULT FALSE,  -- Whether fingerprint is registered
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_patient_email (email),
    INDEX idx_patient_phone (phone)
);

-- Doctors table for login and registration
CREATE TABLE IF NOT EXISTS doctors (
    id VARCHAR(36) PRIMARY KEY,
    license_id VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,  -- Hashed password for security
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_doctor_license (license_id),
    INDEX idx_doctor_specialization (specialization)
);

-- Consents table (patient grants access to doctor)
CREATE TABLE IF NOT EXISTS consents (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    permissions JSON NOT NULL,  -- Array: ["READ", "WRITE", "SHARE"]
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_consent_patient (patient_id),
    INDEX idx_consent_doctor (doctor_id)
);

-- Doctor-Patient assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id VARCHAR(36) PRIMARY KEY,
    doctor_id VARCHAR(36) NOT NULL,
    patient_id VARCHAR(36) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_assignment_doctor (doctor_id),
    INDEX idx_assignment_patient (patient_id),
    UNIQUE KEY unique_doctor_patient (doctor_id, patient_id)
);

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

-- Patient reports table (for frontend uploaded reports)
CREATE TABLE IF NOT EXISTS patient_reports (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL,
    disease_name VARCHAR(255) NOT NULL,
    attributes TEXT NOT NULL,  -- JSON array of attributes
    measurement_date DATE NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    status ENUM('pending', 'reviewed', 'archived') DEFAULT 'pending',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- AI-generated fields
    ai_summary TEXT,
    ai_diagnosis TEXT,
    ai_key_findings TEXT,
    ai_recommendations TEXT,
    ai_test_results TEXT,
    rag_report_id VARCHAR(50),
    processed_by_ai BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_report_patient (patient_id),
    INDEX idx_report_date (measurement_date),
    INDEX idx_report_status (status)
);

-- Sample queries for reference:

-- Get all reports for a patient
-- SELECT * FROM medical_reports WHERE patient_name LIKE '%John%';

-- Get reports with abnormal results
-- SELECT * FROM report_summary_view WHERE abnormal_tests > 0;

-- Get recent reports
-- SELECT * FROM medical_reports ORDER BY upload_date DESC LIMIT 10;

-- Get query history for a report
-- SELECT * FROM query_history WHERE report_id = 'RPT-001' ORDER BY query_time DESC;

-- Get all patients assigned to a doctor
-- SELECT p.* FROM patients p 
-- JOIN assignments a ON p.id = a.patient_id 
-- WHERE a.doctor_id = 'doc-001';

-- Get patient login (verify PIN)
-- SELECT * FROM patients WHERE email = 'john@example.com';

-- Get doctor login (verify password)
-- SELECT * FROM doctors WHERE license_id = 'MED-12345';
