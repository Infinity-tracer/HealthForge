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
    
    # ==================== FINGERPRINT OPERATIONS ====================
    
    def register_fingerprint(self, email: str, credential_id: str, public_key: str) -> bool:
        """
        Register WebAuthn fingerprint credential for a patient
        
        Parameters:
        - email: Patient's email address
        - credential_id: Base64 encoded WebAuthn credential ID
        - public_key: Base64 encoded WebAuthn public key
        
        Returns:
        - True if successful, False otherwise
        """
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            query = """
                UPDATE patients 
                SET fingerprint_credential_id = %s, 
                    fingerprint_public_key = %s,
                    fingerprint_registered = TRUE
                WHERE email = %s AND is_active = TRUE
            """
            cursor.execute(query, (credential_id, public_key, email))
            conn.commit()
            
            success = cursor.rowcount > 0
            if success:
                print(f"Fingerprint registered successfully for: {email}")
            return success
            
        except Error as e:
            print(f"Error registering fingerprint: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
    
    def get_fingerprint_credential(self, email: str) -> dict:
        """
        Get fingerprint credential for a patient
        
        Returns:
        - Dictionary with credential_id and public_key if found, None otherwise
        """
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = """
                SELECT id, fingerprint_credential_id, fingerprint_public_key, fingerprint_registered
                FROM patients 
                WHERE email = %s AND is_active = TRUE AND fingerprint_registered = TRUE
            """
            cursor.execute(query, (email,))
            result = cursor.fetchone()
            
            if result and result.get('fingerprint_registered'):
                return {
                    'patient_id': result['id'],
                    'credential_id': result['fingerprint_credential_id'],
                    'public_key': result['fingerprint_public_key']
                }
            return None
            
        except Error as e:
            print(f"Error getting fingerprint credential: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def verify_fingerprint_credential(self, email: str, credential_id: str) -> dict:
        """
        Verify fingerprint credential matches stored credential
        
        Returns:
        - Patient data if credential matches, None otherwise
        """
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = """
                SELECT id, first_name, last_name, email, phone, date_of_birth, 
                       fingerprint_credential_id, fingerprint_public_key
                FROM patients 
                WHERE email = %s AND fingerprint_credential_id = %s 
                      AND fingerprint_registered = TRUE AND is_active = TRUE
            """
            cursor.execute(query, (email, credential_id))
            result = cursor.fetchone()
            
            if result:
                # Remove sensitive fingerprint data from response
                result.pop('fingerprint_credential_id', None)
                result.pop('fingerprint_public_key', None)
                return result
            
            return None
            
        except Error as e:
            print(f"Error verifying fingerprint: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def has_fingerprint_registered(self, email: str) -> bool:
        """Check if patient has fingerprint registered"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = """
                SELECT fingerprint_registered 
                FROM patients 
                WHERE email = %s AND is_active = TRUE
            """
            cursor.execute(query, (email,))
            result = cursor.fetchone()
            
            return result and result.get('fingerprint_registered', False)
            
        except Error as e:
            print(f"Error checking fingerprint registration: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
    
    # ==================== EMAIL VERIFICATION OPERATIONS ====================
    
    def create_email_verification(self, verification_data: dict) -> str:
        """
        Create a new email verification record
        
        Parameters:
        - verification_data: Dictionary containing registration info and verification code
        
        Returns:
        - verification_id if successful, None otherwise
        """
        try:
            import hashlib
            from datetime import datetime, timedelta
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            verification_id = str(uuid.uuid4())
            
            # Hash the PIN for security
            hashed_pin = hashlib.sha256(verification_data.get('pin', '').encode()).hexdigest()
            
            # Set expiration time (10 minutes from now)
            expires_at = datetime.now() + timedelta(minutes=10)
            
            # Delete any existing verification for this email
            delete_query = "DELETE FROM email_verifications WHERE email = %s"
            cursor.execute(delete_query, (verification_data.get('email'),))
            
            query = """
                INSERT INTO email_verifications (
                    id, email, verification_code, pin, first_name, last_name, 
                    phone, date_of_birth, expires_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            values = (
                verification_id,
                verification_data.get('email'),
                verification_data.get('verification_code'),
                hashed_pin,
                verification_data.get('firstName'),
                verification_data.get('lastName'),
                verification_data.get('phone'),
                verification_data.get('dateOfBirth'),
                expires_at
            )
            
            cursor.execute(query, values)
            conn.commit()
            
            print(f"Email verification created with ID: {verification_id}")
            return verification_id
            
        except Error as e:
            print(f"Error creating email verification: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def verify_email_code(self, email: str, code: str) -> dict:
        """
        Verify the email verification code
        
        Parameters:
        - email: User's email address
        - code: 6-digit verification code
        
        Returns:
        - Verification data if valid, None otherwise
        """
        try:
            from datetime import datetime
            
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = """
                SELECT * FROM email_verifications 
                WHERE email = %s AND verification_code = %s 
                AND expires_at > %s AND verified = FALSE AND attempts < 5
            """
            cursor.execute(query, (email, code, datetime.now()))
            result = cursor.fetchone()
            
            if result:
                # Mark as verified
                update_query = "UPDATE email_verifications SET verified = TRUE WHERE id = %s"
                cursor.execute(update_query, (result['id'],))
                conn.commit()
                return result
            else:
                # Increment attempts
                update_query = """
                    UPDATE email_verifications SET attempts = attempts + 1 
                    WHERE email = %s AND verified = FALSE
                """
                cursor.execute(update_query, (email,))
                conn.commit()
                return None
            
        except Error as e:
            print(f"Error verifying email code: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def get_pending_verification(self, email: str) -> dict:
        """
        Get pending verification record for an email
        
        Returns:
        - Verification data if exists and not expired, None otherwise
        """
        try:
            from datetime import datetime
            
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = """
                SELECT * FROM email_verifications 
                WHERE email = %s AND expires_at > %s AND verified = FALSE
            """
            cursor.execute(query, (email, datetime.now()))
            result = cursor.fetchone()
            
            return result
            
        except Error as e:
            print(f"Error getting pending verification: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def delete_verification(self, email: str):
        """Delete verification record after successful registration"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            query = "DELETE FROM email_verifications WHERE email = %s"
            cursor.execute(query, (email,))
            conn.commit()
            
        except Error as e:
            print(f"Error deleting verification: {e}")
        finally:
            if cursor:
                cursor.close()
    
    def create_patient_from_verification(self, verification_data: dict) -> str:
        """
        Create patient from verified email data
        
        Parameters:
        - verification_data: The verification record data
        
        Returns:
        - patient_id if successful, None otherwise
        """
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            patient_id = str(uuid.uuid4())
            
            query = """
                INSERT INTO patients (
                    id, first_name, last_name, email, phone, date_of_birth, pin
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            
            values = (
                patient_id,
                verification_data.get('first_name'),
                verification_data.get('last_name'),
                verification_data.get('email'),
                verification_data.get('phone'),
                verification_data.get('date_of_birth'),
                verification_data.get('pin')  # Already hashed
            )
            
            cursor.execute(query, values)
            conn.commit()
            
            print(f"Patient registered successfully with ID: {patient_id}")
            return patient_id
            
        except Error as e:
            print(f"Error registering patient from verification: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def delete_patient(self, patient_id: str) -> bool:
        """
        Delete a patient account and all related data
        
        Parameters:
        - patient_id: The patient's unique ID
        
        Returns:
        - True if deleted successfully, False otherwise
        """
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # Delete related data first (foreign key constraints)
            # Delete from patient_reports
            cursor.execute("DELETE FROM patient_reports WHERE patient_id = %s", (patient_id,))
            
            # Delete from consents
            cursor.execute("DELETE FROM consents WHERE patient_id = %s", (patient_id,))
            
            # Delete from assignments
            cursor.execute("DELETE FROM assignments WHERE patient_id = %s", (patient_id,))
            
            # Delete email verifications by getting patient email first
            cursor.execute("SELECT email FROM patients WHERE id = %s", (patient_id,))
            result = cursor.fetchone()
            if result:
                email = result[0]
                cursor.execute("DELETE FROM email_verifications WHERE email = %s", (email,))
            
            # Finally delete the patient
            cursor.execute("DELETE FROM patients WHERE id = %s", (patient_id,))
            
            conn.commit()
            
            deleted = cursor.rowcount > 0
            if deleted:
                print(f"Patient account deleted: {patient_id}")
            
            return deleted
            
        except Error as e:
            print(f"Error deleting patient: {e}")
            conn.rollback()
            return False
        finally:
            if cursor:
                cursor.close()
    
    def delete_doctor(self, doctor_id: str) -> bool:
        """
        Delete a doctor account and all related data
        
        Parameters:
        - doctor_id: The doctor's unique ID
        
        Returns:
        - True if deleted successfully, False otherwise
        """
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # Delete related data first (foreign key constraints)
            # Delete from consents where this doctor is involved
            cursor.execute("DELETE FROM consents WHERE doctor_id = %s", (doctor_id,))
            
            # Delete from assignments where this doctor is involved  
            cursor.execute("DELETE FROM assignments WHERE doctor_id = %s", (doctor_id,))
            
            # Finally delete the doctor
            cursor.execute("DELETE FROM doctors WHERE id = %s", (doctor_id,))
            
            conn.commit()
            
            deleted = cursor.rowcount > 0
            if deleted:
                print(f"Doctor account deleted: {doctor_id}")
            
            return deleted
            
        except Error as e:
            print(f"Error deleting doctor: {e}")
            conn.rollback()
            return False
        finally:
            if cursor:
                cursor.close()
    
    def close(self):
        """Close the database connection"""
        self.db.disconnect()


class PatientReportDB:
    """
    Database operations for Patient Reports, Consents, and Assignments
    """
    
    def __init__(self):
        self.db = DatabaseConnection()
        if not self.db.connect():
            raise Exception("Failed to connect to database")
    
    # ==================== REPORT OPERATIONS ====================
    
    def create_report(self, report_data: dict) -> str:
        """Create a new patient report"""
        try:
            import uuid
            from datetime import datetime
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            report_id = report_data.get('id') or str(uuid.uuid4())
            
            # Parse uploadedAt timestamp (handles ISO format)
            uploaded_at = report_data.get('uploadedAt')
            if uploaded_at:
                try:
                    # Handle ISO format like "2025-12-21T21:40:00.000Z"
                    if 'T' in str(uploaded_at):
                        uploaded_at = str(uploaded_at).replace('T', ' ').replace('Z', '').split('.')[0]
                except:
                    uploaded_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            else:
                uploaded_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            query = """
                INSERT INTO patient_reports (
                    id, patient_id, disease_name, attributes, measurement_date,
                    file_name, file_type, status, uploaded_at,
                    ai_summary, ai_diagnosis, ai_key_findings, ai_recommendations,
                    ai_test_results, rag_report_id, processed_by_ai
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            values = (
                report_id,
                report_data.get('patientId'),
                report_data.get('diseaseName'),
                report_data.get('attributes'),
                report_data.get('measurementDate'),
                report_data.get('fileName'),
                report_data.get('fileType'),
                report_data.get('status', 'pending'),
                uploaded_at,
                report_data.get('aiSummary'),
                report_data.get('aiDiagnosis'),
                report_data.get('aiKeyFindings'),
                report_data.get('aiRecommendations'),
                report_data.get('aiTestResults'),
                report_data.get('ragReportId'),
                report_data.get('processedByAi', False)
            )
            
            cursor.execute(query, values)
            conn.commit()
            
            print(f"Report created with ID: {report_id}")
            return report_id
            
        except Error as e:
            print(f"Error creating report: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def get_reports_by_patient_id(self, patient_id: str) -> list:
        """Get all reports for a patient"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = """
                SELECT * FROM patient_reports 
                WHERE patient_id = %s 
                ORDER BY uploaded_at DESC
            """
            cursor.execute(query, (patient_id,))
            results = cursor.fetchall()
            
            # Convert to camelCase for frontend
            formatted_results = []
            for r in results:
                formatted_results.append({
                    'id': r['id'],
                    'patientId': r['patient_id'],
                    'diseaseName': r['disease_name'],
                    'attributes': r['attributes'],
                    'measurementDate': str(r['measurement_date']) if r['measurement_date'] else None,
                    'fileName': r['file_name'],
                    'fileType': r['file_type'],
                    'status': r['status'],
                    'uploadedAt': str(r['uploaded_at']) if r['uploaded_at'] else None,
                    'aiSummary': r['ai_summary'],
                    'aiDiagnosis': r['ai_diagnosis'],
                    'aiKeyFindings': r['ai_key_findings'],
                    'aiRecommendations': r['ai_recommendations'],
                    'aiTestResults': r['ai_test_results'],
                    'ragReportId': r['rag_report_id'],
                    'processedByAi': r['processed_by_ai']
                })
            
            return formatted_results
            
        except Error as e:
            print(f"Error retrieving reports: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
    
    def get_report_by_id(self, report_id: str) -> dict:
        """Get a report by ID"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = "SELECT * FROM patient_reports WHERE id = %s"
            cursor.execute(query, (report_id,))
            r = cursor.fetchone()
            
            if r:
                return {
                    'id': r['id'],
                    'patientId': r['patient_id'],
                    'diseaseName': r['disease_name'],
                    'attributes': r['attributes'],
                    'measurementDate': str(r['measurement_date']) if r['measurement_date'] else None,
                    'fileName': r['file_name'],
                    'fileType': r['file_type'],
                    'status': r['status'],
                    'uploadedAt': str(r['uploaded_at']) if r['uploaded_at'] else None,
                    'aiSummary': r['ai_summary'],
                    'aiDiagnosis': r['ai_diagnosis'],
                    'aiKeyFindings': r['ai_key_findings'],
                    'aiRecommendations': r['ai_recommendations'],
                    'aiTestResults': r['ai_test_results'],
                    'ragReportId': r['rag_report_id'],
                    'processedByAi': r['processed_by_ai']
                }
            return None
            
        except Error as e:
            print(f"Error retrieving report: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def update_report_status(self, report_id: str, status: str) -> bool:
        """Update report status"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            query = "UPDATE patient_reports SET status = %s WHERE id = %s"
            cursor.execute(query, (status, report_id))
            conn.commit()
            
            return cursor.rowcount > 0
            
        except Error as e:
            print(f"Error updating report status: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
    
    def update_report_ai_data(self, report_id: str, ai_data: dict) -> bool:
        """Update report with AI-generated data"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            query = """
                UPDATE patient_reports SET
                    ai_summary = %s,
                    ai_diagnosis = %s,
                    ai_key_findings = %s,
                    ai_recommendations = %s,
                    ai_test_results = %s,
                    rag_report_id = %s,
                    processed_by_ai = %s
                WHERE id = %s
            """
            
            values = (
                ai_data.get('aiSummary'),
                ai_data.get('aiDiagnosis'),
                ai_data.get('aiKeyFindings'),
                ai_data.get('aiRecommendations'),
                ai_data.get('aiTestResults'),
                ai_data.get('ragReportId'),
                ai_data.get('processedByAi', True),
                report_id
            )
            
            cursor.execute(query, values)
            conn.commit()
            
            return cursor.rowcount > 0
            
        except Error as e:
            print(f"Error updating report AI data: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
    
    def delete_report(self, report_id: str) -> bool:
        """
        Delete a patient report
        
        Parameters:
        - report_id: The report's unique ID
        
        Returns:
        - True if deleted successfully, False otherwise
        """
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            query = "DELETE FROM patient_reports WHERE id = %s"
            cursor.execute(query, (report_id,))
            conn.commit()
            
            deleted = cursor.rowcount > 0
            if deleted:
                print(f"Report deleted: {report_id}")
            
            return deleted
            
        except Error as e:
            print(f"Error deleting report: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
    
    # ==================== CONSENT OPERATIONS ====================
    
    def create_consent(self, consent_data: dict) -> str:
        """Create a new consent"""
        try:
            import uuid
            from datetime import datetime
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            consent_id = consent_data.get('id') or str(uuid.uuid4())
            
            # Parse createdAt timestamp
            created_at = consent_data.get('createdAt')
            if created_at:
                try:
                    if 'T' in str(created_at):
                        created_at = str(created_at).replace('T', ' ').replace('Z', '').split('.')[0]
                except:
                    created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            else:
                created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            query = """
                INSERT INTO consents (
                    id, patient_id, doctor_id, permissions, start_date, end_date, active, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            values = (
                consent_id,
                consent_data.get('patientId'),
                consent_data.get('doctorId'),
                consent_data.get('permissions'),
                consent_data.get('startDate'),
                consent_data.get('endDate'),
                consent_data.get('active', True),
                created_at
            )
            
            cursor.execute(query, values)
            conn.commit()
            
            print(f"Consent created with ID: {consent_id}")
            return consent_id
            
        except Error as e:
            print(f"Error creating consent: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def get_consents_by_patient_id(self, patient_id: str) -> list:
        """Get all consents for a patient"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = """
                SELECT c.*, d.full_name as doctor_name, d.specialization
                FROM consents c
                LEFT JOIN doctors d ON c.doctor_id = d.id
                WHERE c.patient_id = %s
                ORDER BY c.created_at DESC
            """
            cursor.execute(query, (patient_id,))
            results = cursor.fetchall()
            
            formatted = []
            for c in results:
                formatted.append({
                    'id': c['id'],
                    'patientId': c['patient_id'],
                    'doctorId': c['doctor_id'],
                    'doctorName': c.get('doctor_name'),
                    'specialization': c.get('specialization'),
                    'permissions': c['permissions'],
                    'startDate': str(c['start_date']) if c['start_date'] else None,
                    'endDate': str(c['end_date']) if c['end_date'] else None,
                    'active': c['active'],
                    'createdAt': str(c['created_at']) if c['created_at'] else None
                })
            
            return formatted
            
        except Error as e:
            print(f"Error retrieving consents: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
    
    def get_consents_by_doctor_id(self, doctor_id: str) -> list:
        """Get all consents for a doctor"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = """
                SELECT c.*, p.first_name, p.last_name, p.email
                FROM consents c
                LEFT JOIN patients p ON c.patient_id = p.id
                WHERE c.doctor_id = %s AND c.active = TRUE
                ORDER BY c.created_at DESC
            """
            cursor.execute(query, (doctor_id,))
            results = cursor.fetchall()
            
            formatted = []
            for c in results:
                formatted.append({
                    'id': c['id'],
                    'patientId': c['patient_id'],
                    'patientName': f"{c.get('first_name', '')} {c.get('last_name', '')}".strip(),
                    'patientEmail': c.get('email'),
                    'doctorId': c['doctor_id'],
                    'permissions': c['permissions'],
                    'startDate': str(c['start_date']) if c['start_date'] else None,
                    'endDate': str(c['end_date']) if c['end_date'] else None,
                    'active': c['active'],
                    'createdAt': str(c['created_at']) if c['created_at'] else None
                })
            
            return formatted
            
        except Error as e:
            print(f"Error retrieving consents: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
    
    def revoke_consent(self, consent_id: str) -> bool:
        """Revoke a consent"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            query = "UPDATE consents SET active = FALSE WHERE id = %s"
            cursor.execute(query, (consent_id,))
            conn.commit()
            
            return cursor.rowcount > 0
            
        except Error as e:
            print(f"Error revoking consent: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
    
    # ==================== ASSIGNMENT OPERATIONS ====================
    
    def create_assignment(self, assignment_data: dict) -> str:
        """Create a doctor-patient assignment"""
        try:
            import uuid
            from datetime import datetime
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            assignment_id = assignment_data.get('id') or str(uuid.uuid4())
            
            # Parse assignedAt timestamp
            assigned_at = assignment_data.get('assignedAt')
            if assigned_at:
                try:
                    if 'T' in str(assigned_at):
                        assigned_at = str(assigned_at).replace('T', ' ').replace('Z', '').split('.')[0]
                except:
                    assigned_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            else:
                assigned_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            query = """
                INSERT INTO assignments (id, doctor_id, patient_id, assigned_at)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE assigned_at = VALUES(assigned_at)
            """
            
            values = (
                assignment_id,
                assignment_data.get('doctorId'),
                assignment_data.get('patientId'),
                assigned_at
            )
            
            cursor.execute(query, values)
            conn.commit()
            
            return assignment_id
            
        except Error as e:
            print(f"Error creating assignment: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def get_assignments_by_doctor_id(self, doctor_id: str) -> list:
        """Get all patients assigned to a doctor with active consent only"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # Only return assignments where there is an active consent
            query = """
                SELECT a.*, p.first_name, p.last_name, p.email, p.phone, p.date_of_birth
                FROM assignments a
                LEFT JOIN patients p ON a.patient_id = p.id
                INNER JOIN consents c ON c.doctor_id = a.doctor_id AND c.patient_id = a.patient_id AND c.active = TRUE
                WHERE a.doctor_id = %s
                ORDER BY a.assigned_at DESC
            """
            cursor.execute(query, (doctor_id,))
            results = cursor.fetchall()
            
            formatted = []
            for a in results:
                formatted.append({
                    'id': a['id'],
                    'doctorId': a['doctor_id'],
                    'patientId': a['patient_id'],
                    'patientName': f"{a.get('first_name', '')} {a.get('last_name', '')}".strip(),
                    'patientEmail': a.get('email'),
                    'patientPhone': a.get('phone'),
                    'patientDOB': str(a['date_of_birth']) if a.get('date_of_birth') else None,
                    'assignedAt': str(a['assigned_at']) if a['assigned_at'] else None
                })
            
            return formatted
            
        except Error as e:
            print(f"Error retrieving assignments: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
    
    def get_assignments_by_patient_id(self, patient_id: str) -> list:
        """Get all doctors assigned to a patient"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = """
                SELECT a.*, d.full_name, d.specialization, d.license_id
                FROM assignments a
                LEFT JOIN doctors d ON a.doctor_id = d.id
                WHERE a.patient_id = %s
                ORDER BY a.assigned_at DESC
            """
            cursor.execute(query, (patient_id,))
            results = cursor.fetchall()
            
            formatted = []
            for a in results:
                formatted.append({
                    'id': a['id'],
                    'doctorId': a['doctor_id'],
                    'doctorName': a.get('full_name'),
                    'specialization': a.get('specialization'),
                    'licenseId': a.get('license_id'),
                    'patientId': a['patient_id'],
                    'assignedAt': str(a['assigned_at']) if a['assigned_at'] else None
                })
            
            return formatted
            
        except Error as e:
            print(f"Error retrieving assignments: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
    
    # ==================== EMAIL VERIFICATION OPERATIONS ====================
    
    def create_email_verification(self, verification_data: dict) -> str:
        """
        Create a new email verification record
        
        Parameters:
        - verification_data: Dictionary containing registration info and verification code
        
        Returns:
        - verification_id if successful, None otherwise
        """
        try:
            import uuid
            import hashlib
            from datetime import datetime, timedelta
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            verification_id = str(uuid.uuid4())
            
            # Hash the PIN for security
            hashed_pin = hashlib.sha256(verification_data.get('pin', '').encode()).hexdigest()
            
            # Set expiration time (10 minutes from now)
            expires_at = datetime.now() + timedelta(minutes=10)
            
            # Delete any existing verification for this email
            delete_query = "DELETE FROM email_verifications WHERE email = %s"
            cursor.execute(delete_query, (verification_data.get('email'),))
            
            query = """
                INSERT INTO email_verifications (
                    id, email, verification_code, pin, first_name, last_name, 
                    phone, date_of_birth, expires_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            values = (
                verification_id,
                verification_data.get('email'),
                verification_data.get('verification_code'),
                hashed_pin,
                verification_data.get('firstName'),
                verification_data.get('lastName'),
                verification_data.get('phone'),
                verification_data.get('dateOfBirth'),
                expires_at
            )
            
            cursor.execute(query, values)
            conn.commit()
            
            print(f"Email verification created with ID: {verification_id}")
            return verification_id
            
        except Error as e:
            print(f"Error creating email verification: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def verify_email_code(self, email: str, code: str) -> dict:
        """
        Verify the email verification code
        
        Parameters:
        - email: User's email address
        - code: 6-digit verification code
        
        Returns:
        - Verification data if valid, None otherwise
        """
        try:
            from datetime import datetime
            
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = """
                SELECT * FROM email_verifications 
                WHERE email = %s AND verification_code = %s 
                AND expires_at > %s AND verified = FALSE AND attempts < 5
            """
            cursor.execute(query, (email, code, datetime.now()))
            result = cursor.fetchone()
            
            if result:
                # Mark as verified
                update_query = "UPDATE email_verifications SET verified = TRUE WHERE id = %s"
                cursor.execute(update_query, (result['id'],))
                conn.commit()
                return result
            else:
                # Increment attempts
                update_query = """
                    UPDATE email_verifications SET attempts = attempts + 1 
                    WHERE email = %s AND verified = FALSE
                """
                cursor.execute(update_query, (email,))
                conn.commit()
                return None
            
        except Error as e:
            print(f"Error verifying email code: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def get_pending_verification(self, email: str) -> dict:
        """
        Get pending verification record for an email
        
        Returns:
        - Verification data if exists and not expired, None otherwise
        """
        try:
            from datetime import datetime
            
            conn = self.db.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            query = """
                SELECT * FROM email_verifications 
                WHERE email = %s AND expires_at > %s AND verified = FALSE
            """
            cursor.execute(query, (email, datetime.now()))
            result = cursor.fetchone()
            
            return result
            
        except Error as e:
            print(f"Error getting pending verification: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def delete_verification(self, email: str):
        """Delete verification record after successful registration"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            query = "DELETE FROM email_verifications WHERE email = %s"
            cursor.execute(query, (email,))
            conn.commit()
            
        except Error as e:
            print(f"Error deleting verification: {e}")
        finally:
            if cursor:
                cursor.close()
    
    def create_patient_from_verification(self, verification_data: dict) -> str:
        """
        Create patient from verified email data
        
        Parameters:
        - verification_data: The verification record data
        
        Returns:
        - patient_id if successful, None otherwise
        """
        try:
            import uuid
            
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            patient_id = str(uuid.uuid4())
            
            query = """
                INSERT INTO patients (
                    id, first_name, last_name, email, phone, date_of_birth, pin
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            
            values = (
                patient_id,
                verification_data.get('first_name'),
                verification_data.get('last_name'),
                verification_data.get('email'),
                verification_data.get('phone'),
                verification_data.get('date_of_birth'),
                verification_data.get('pin')  # Already hashed
            )
            
            cursor.execute(query, values)
            conn.commit()
            
            print(f"Patient registered successfully with ID: {patient_id}")
            return patient_id
            
        except Error as e:
            print(f"Error registering patient from verification: {e}")
            return None
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
