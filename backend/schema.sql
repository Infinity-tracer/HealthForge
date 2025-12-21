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

-- Sample queries for reference:

-- Get all reports for a patient
-- SELECT * FROM medical_reports WHERE patient_name LIKE '%John%';

-- Get reports with abnormal results
-- SELECT * FROM report_summary_view WHERE abnormal_tests > 0;

-- Get recent reports
-- SELECT * FROM medical_reports ORDER BY upload_date DESC LIMIT 10;

-- Get query history for a report
-- SELECT * FROM query_history WHERE report_id = 'RPT-001' ORDER BY query_time DESC;
