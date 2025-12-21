"""
Database Configuration and Connection Module
Handles MySQL database connections and operations for medical reports
"""

import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv
from datetime import datetime
import uuid
import json

load_dotenv()


class DatabaseConnection:
    """MySQL Database Connection Handler"""
    
    def __init__(self):
        self.host = os.getenv("MYSQL_HOST", "localhost")
        self.port = int(os.getenv("MYSQL_PORT", 3306))
        self.user = os.getenv("MYSQL_USER", "root")
        self.password = os.getenv("MYSQL_PASSWORD", "")
        self.database = os.getenv("MYSQL_DATABASE", "medical_reports_db")
        self.connection = None
    
    def connect(self):
        """Establish database connection"""
        try:
            self.connection = mysql.connector.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database
            )
            if self.connection.is_connected():
                print("Successfully connected to MySQL database")
                return True
        except Error as e:
            print(f"Error connecting to MySQL: {e}")
            return False
    
    def disconnect(self):
        """Close database connection"""
        if self.connection and self.connection.is_connected():
            self.connection.close()
            print("MySQL connection closed")
    
    def get_connection(self):
        """Get active connection, reconnect if needed"""
        if not self.connection or not self.connection.is_connected():
            self.connect()
        return self.connection


class MedicalReportDB:
    """Database operations for medical reports"""
    
    def __init__(self):
        self.db = DatabaseConnection()
    
    def generate_report_id(self):
        """Generate unique report ID"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        unique_id = str(uuid.uuid4())[:8].upper()
        return f"RPT-{timestamp}-{unique_id}"
    
    def save_report(self, report_data: dict) -> str:
        """
        Save a medical report to the database
        
        Parameters:
        - report_data: Dictionary containing report information
        
        Returns:
        - report_id: The unique ID assigned to the report
        """
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            report_id = self.generate_report_id()
            
            query = """
                INSERT INTO medical_reports (
                    report_id, file_name, patient_name, patient_age, patient_gender,
                    patient_id, report_date, report_type, hospital_name, doctor_name,
                    summary, diagnosis, key_findings, test_results, recommendations,
                    raw_text, processed_status, faiss_index_path
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """
            
            values = (
                report_id,
                report_data.get('file_name', ''),
                report_data.get('patient_name'),
                report_data.get('patient_age'),
                report_data.get('patient_gender', 'Unknown'),
                report_data.get('patient_id'),
                report_data.get('report_date'),
                report_data.get('report_type'),
                report_data.get('hospital_name'),
                report_data.get('doctor_name'),
                report_data.get('summary'),
                report_data.get('diagnosis'),
                report_data.get('key_findings'),
                json.dumps(report_data.get('test_results', {})),
                report_data.get('recommendations'),
                report_data.get('raw_text'),
                'processed',
                report_data.get('faiss_index_path', 'faiss_index')
            )
            
            cursor.execute(query, values)
            conn.commit()
            
            print(f"Report saved successfully with ID: {report_id}")
            return report_id
            
        except Error as e:
            print(f"Error saving report: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def save_test_results(self, report_id: str, test_results: list):
        """
        Save individual test results for a report
        
        Parameters:
        - report_id: The report's unique ID
        - test_results: List of dictionaries with test information
        """
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            query = """
                INSERT INTO test_results (
                    report_id, test_name, test_value, unit, normal_range, status
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """
            
            for test in test_results:
                values = (
                    report_id,
                    test.get('test_name'),
                    test.get('test_value'),
                    test.get('unit'),
                    test.get('normal_range'),
                    test.get('status', 'Unknown')
                )
                cursor.execute(query, values)
            
            conn.commit()
            print(f"Test results saved for report: {report_id}")
            
        except Error as e:
            print(f"Error saving test results: {e}")
        finally:
            if cursor:
                cursor.close()
    
    def save_query(self, report_id: str, question: str, response: str):
        """Save a query and its response to history"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            query = """
                INSERT INTO query_history (report_id, user_question, ai_response)
                VALUES (%s, %s, %s)
            """
            cursor.execute(query, (report_id, question, response))
            conn.commit()
            
        except Error as e:
            print(f"Error saving query: {e}")
        finally:
            if cursor:
                cursor.close()
    
    def get_report_by_id(self, report_id: str) -> dict:
        """Retrieve a report by its ID"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = "SELECT * FROM medical_reports WHERE report_id = %s"
            cursor.execute(query, (report_id,))
            result = cursor.fetchone()
            
            return result
            
        except Error as e:
            print(f"Error retrieving report: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def get_all_reports(self, limit: int = 100) -> list:
        """Retrieve all reports"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = """
                SELECT id, report_id, file_name, patient_name, patient_age,
                       report_type, report_date, summary, upload_date
                FROM medical_reports 
                ORDER BY upload_date DESC 
                LIMIT %s
            """
            cursor.execute(query, (limit,))
            results = cursor.fetchall()
            
            return results
            
        except Error as e:
            print(f"Error retrieving reports: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
    
    def search_reports(self, search_term: str) -> list:
        """Search reports by patient name or diagnosis"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = """
                SELECT * FROM medical_reports 
                WHERE patient_name LIKE %s 
                   OR diagnosis LIKE %s 
                   OR summary LIKE %s
                ORDER BY upload_date DESC
            """
            search_pattern = f"%{search_term}%"
            cursor.execute(query, (search_pattern, search_pattern, search_pattern))
            results = cursor.fetchall()
            
            return results
            
        except Error as e:
            print(f"Error searching reports: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
    
    def get_query_history(self, report_id: str) -> list:
        """Get query history for a specific report"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = """
                SELECT * FROM query_history 
                WHERE report_id = %s 
                ORDER BY query_time DESC
            """
            cursor.execute(query, (report_id,))
            results = cursor.fetchall()
            
            return results
            
        except Error as e:
            print(f"Error retrieving query history: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
    
    def delete_report(self, report_id: str) -> bool:
        """Delete a report and all associated data"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            query = "DELETE FROM medical_reports WHERE report_id = %s"
            cursor.execute(query, (report_id,))
            conn.commit()
            
            return cursor.rowcount > 0
            
        except Error as e:
            print(f"Error deleting report: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
    
    def close(self):
        """Close the database connection"""
        self.db.disconnect()


class UserDB:
    """
    Database operations for Patients and Doctors
    Handles registration, login, and profile management
    """
    
    def __init__(self):
        self.db = DatabaseConnection()
        if not self.db.connect():
            raise Exception("Failed to connect to database")
    
    # ==================== PATIENT OPERATIONS ====================
    
    def create_patient(self, patient_data: dict) -> str:
        """
        Register a new patient
        
        Parameters:
        - patient_data: Dictionary containing patient registration info
        
        Returns:
        - patient_id if successful, None otherwise
        """
        try:
            import uuid
            import hashlib
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            patient_id = str(uuid.uuid4())
            
            # Hash the PIN for security
            hashed_pin = hashlib.sha256(patient_data.get('pin', '').encode()).hexdigest()
            
            query = """
                INSERT INTO patients (
                    id, first_name, last_name, email, phone, date_of_birth, pin
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            
            values = (
                patient_id,
                patient_data.get('firstName'),
                patient_data.get('lastName'),
                patient_data.get('email'),
                patient_data.get('phone'),
                patient_data.get('dateOfBirth'),
                hashed_pin
            )
            
            cursor.execute(query, values)
            conn.commit()
            
            print(f"Patient registered successfully with ID: {patient_id}")
            return patient_id
            
        except Error as e:
            print(f"Error registering patient: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def get_patient_by_email(self, email: str) -> dict:
        """Get patient by email address"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = "SELECT * FROM patients WHERE email = %s AND is_active = TRUE"
            cursor.execute(query, (email,))
            result = cursor.fetchone()
            
            return result
            
        except Error as e:
            print(f"Error retrieving patient: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def get_patient_by_id(self, patient_id: str) -> dict:
        """Get patient by ID"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = "SELECT * FROM patients WHERE id = %s AND is_active = TRUE"
            cursor.execute(query, (patient_id,))
            result = cursor.fetchone()
            
            return result
            
        except Error as e:
            print(f"Error retrieving patient: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def verify_patient_pin(self, email: str, pin: str) -> dict:
        """
        Verify patient login credentials
        
        Returns:
        - Patient data if credentials are valid, None otherwise
        """
        try:
            import hashlib
            
            patient = self.get_patient_by_email(email)
            if not patient:
                return None
            
            # Hash the provided PIN and compare
            hashed_pin = hashlib.sha256(pin.encode()).hexdigest()
            
            if patient.get('pin') == hashed_pin:
                # Return patient data without the PIN
                patient.pop('pin', None)
                return patient
            
            return None
            
        except Exception as e:
            print(f"Error verifying patient: {e}")
            return None
    
    def get_all_patients(self, limit: int = 100) -> list:
        """Retrieve all active patients"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = """
                SELECT id, first_name, last_name, email, phone, date_of_birth, created_at
                FROM patients 
                WHERE is_active = TRUE
                ORDER BY created_at DESC 
                LIMIT %s
            """
            cursor.execute(query, (limit,))
            results = cursor.fetchall()
            
            return results
            
        except Error as e:
            print(f"Error retrieving patients: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
    
    def patient_exists(self, email: str) -> bool:
        """Check if a patient with the given email already exists"""
        patient = self.get_patient_by_email(email)
        return patient is not None
    
    # ==================== DOCTOR OPERATIONS ====================
    
    def create_doctor(self, doctor_data: dict) -> str:
        """
        Register a new doctor
        
        Parameters:
        - doctor_data: Dictionary containing doctor registration info
        
        Returns:
        - doctor_id if successful, None otherwise
        """
        try:
            import uuid
            import hashlib
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            doctor_id = str(uuid.uuid4())
            
            # Hash the password for security
            hashed_password = hashlib.sha256(doctor_data.get('password', '').encode()).hexdigest()
            
            query = """
                INSERT INTO doctors (
                    id, license_id, full_name, specialization, password, verified
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """
            
            values = (
                doctor_id,
                doctor_data.get('licenseId'),
                doctor_data.get('fullName'),
                doctor_data.get('specialization'),
                hashed_password,
                doctor_data.get('verified', False)
            )
            
            cursor.execute(query, values)
            conn.commit()
            
            print(f"Doctor registered successfully with ID: {doctor_id}")
            return doctor_id
            
        except Error as e:
            print(f"Error registering doctor: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def get_doctor_by_license_id(self, license_id: str) -> dict:
        """Get doctor by license ID"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = "SELECT * FROM doctors WHERE license_id = %s AND is_active = TRUE"
            cursor.execute(query, (license_id,))
            result = cursor.fetchone()
            
            return result
            
        except Error as e:
            print(f"Error retrieving doctor: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def get_doctor_by_id(self, doctor_id: str) -> dict:
        """Get doctor by ID"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = "SELECT * FROM doctors WHERE id = %s AND is_active = TRUE"
            cursor.execute(query, (doctor_id,))
            result = cursor.fetchone()
            
            return result
            
        except Error as e:
            print(f"Error retrieving doctor: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def verify_doctor_password(self, license_id: str, password: str) -> dict:
        """
        Verify doctor login credentials
        
        Returns:
        - Doctor data if credentials are valid, None otherwise
        """
        try:
            import hashlib
            
            doctor = self.get_doctor_by_license_id(license_id)
            if not doctor:
                return None
            
            # Hash the provided password and compare
            hashed_password = hashlib.sha256(password.encode()).hexdigest()
            
            if doctor.get('password') == hashed_password:
                # Return doctor data without the password
                doctor.pop('password', None)
                return doctor
            
            return None
            
        except Exception as e:
            print(f"Error verifying doctor: {e}")
            return None
    
    def get_all_doctors(self, limit: int = 100) -> list:
        """Retrieve all active doctors"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = """
                SELECT id, license_id, full_name, specialization, verified, created_at
                FROM doctors 
                WHERE is_active = TRUE
                ORDER BY created_at DESC 
                LIMIT %s
            """
            cursor.execute(query, (limit,))
            results = cursor.fetchall()
            
            return results
            
        except Error as e:
            print(f"Error retrieving doctors: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
    
    def doctor_exists(self, license_id: str) -> bool:
        """Check if a doctor with the given license ID already exists"""
        doctor = self.get_doctor_by_license_id(license_id)
        return doctor is not None
    
    def verify_doctor(self, doctor_id: str) -> bool:
        """Mark a doctor as verified"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            query = "UPDATE doctors SET verified = TRUE WHERE id = %s"
            cursor.execute(query, (doctor_id,))
            conn.commit()
            
            return cursor.rowcount > 0
            
        except Error as e:
            print(f"Error verifying doctor: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
    
    def close(self):
        """Close the database connection"""
        self.db.disconnect()


# Utility function to test database connection
def test_connection():
    """Test the database connection"""
    db = DatabaseConnection()
    if db.connect():
        print("Database connection test: SUCCESS")
        db.disconnect()
        return True
    else:
        print("Database connection test: FAILED")
        return False


if __name__ == "__main__":
    test_connection()
