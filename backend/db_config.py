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
