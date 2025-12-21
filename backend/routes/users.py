"""
User Authentication Routes
Handles patient and doctor registration/login with MySQL storage
"""

from flask import Blueprint, request, jsonify
import re
from db_config import UserDB

users_bp = Blueprint('users', __name__)


# ==================== VALIDATION HELPERS ====================

def validate_phone(phone: str) -> bool:
    """Validate phone number is exactly 10 digits"""
    return bool(re.match(r'^\d{10}$', phone))


def validate_email(email: str) -> bool:
    """Validate email format"""
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(email_regex, email))


def validate_pin(pin: str) -> bool:
    """Validate PIN is exactly 6 digits"""
    return bool(re.match(r'^\d{6}$', pin))


def validate_password(password: str) -> tuple:
    """
    Validate password meets requirements:
    - At least 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 number
    - At least 1 special character (@$!%*?&)
    
    Returns: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least 1 uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least 1 lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least 1 number"
    
    if not re.search(r'[@$!%*?&]', password):
        return False, "Password must contain at least 1 special character (@$!%*?&)"
    
    return True, None


# ==================== PATIENT ROUTES ====================

@users_bp.route('/api/patients/register', methods=['POST'])
def register_patient():
    """
    Register a new patient
    
    Expected JSON body:
    {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "1234567890",
        "dateOfBirth": "1990-05-15",
        "pin": "123456"
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'pin']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'{field} is required'
                }), 400
        
        # Validate first name (only letters, min 2 chars)
        if len(data['firstName']) < 2 or not re.match(r'^[a-zA-Z\s]+$', data['firstName']):
            return jsonify({
                'success': False,
                'error': 'First name must be at least 2 characters and contain only letters'
            }), 400
        
        # Validate last name (only letters, min 2 chars)
        if len(data['lastName']) < 2 or not re.match(r'^[a-zA-Z\s]+$', data['lastName']):
            return jsonify({
                'success': False,
                'error': 'Last name must be at least 2 characters and contain only letters'
            }), 400
        
        # Validate email
        if not validate_email(data['email']):
            return jsonify({
                'success': False,
                'error': 'Invalid email address'
            }), 400
        
        # Validate phone (exactly 10 digits)
        if not validate_phone(data['phone']):
            return jsonify({
                'success': False,
                'error': 'Phone number must be exactly 10 digits'
            }), 400
        
        # Validate PIN (exactly 6 digits)
        if not validate_pin(data['pin']):
            return jsonify({
                'success': False,
                'error': 'PIN must be exactly 6 digits'
            }), 400
        
        # Check if patient already exists
        user_db = UserDB()
        
        if user_db.patient_exists(data['email']):
            user_db.close()
            return jsonify({
                'success': False,
                'error': 'A patient with this email already exists'
            }), 409
        
        # Create patient
        patient_id = user_db.create_patient(data)
        user_db.close()
        
        if patient_id:
            return jsonify({
                'success': True,
                'message': 'Patient registered successfully',
                'patientId': patient_id
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to register patient'
            }), 500
            
    except Exception as e:
        print(f"Error in patient registration: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@users_bp.route('/api/patients/login', methods=['POST'])
def login_patient():
    """
    Patient login
    
    Expected JSON body:
    {
        "email": "john@example.com",
        "pin": "123456"
    }
    """
    try:
        data = request.get_json()
        
        email = data.get('email')
        pin = data.get('pin')
        
        if not email or not pin:
            return jsonify({
                'success': False,
                'error': 'Email and PIN are required'
            }), 400
        
        user_db = UserDB()
        patient = user_db.verify_patient_pin(email, pin)
        user_db.close()
        
        if patient:
            # Convert date objects to strings for JSON serialization
            if patient.get('date_of_birth'):
                patient['date_of_birth'] = str(patient['date_of_birth'])
            if patient.get('created_at'):
                patient['created_at'] = str(patient['created_at'])
            if patient.get('updated_at'):
                patient['updated_at'] = str(patient['updated_at'])
            
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'patient': {
                    'id': patient['id'],
                    'firstName': patient['first_name'],
                    'lastName': patient['last_name'],
                    'email': patient['email'],
                    'phone': patient['phone'],
                    'dateOfBirth': patient['date_of_birth']
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid email or PIN'
            }), 401
            
    except Exception as e:
        print(f"Error in patient login: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@users_bp.route('/api/patients', methods=['GET'])
def get_all_patients():
    """Get all registered patients"""
    try:
        user_db = UserDB()
        patients = user_db.get_all_patients()
        user_db.close()
        
        # Convert date objects to strings
        for patient in patients:
            if patient.get('date_of_birth'):
                patient['date_of_birth'] = str(patient['date_of_birth'])
            if patient.get('created_at'):
                patient['created_at'] = str(patient['created_at'])
        
        return jsonify({
            'success': True,
            'patients': patients
        }), 200
        
    except Exception as e:
        print(f"Error retrieving patients: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@users_bp.route('/api/patients/<patient_id>', methods=['GET'])
def get_patient(patient_id):
    """Get a specific patient by ID"""
    try:
        user_db = UserDB()
        patient = user_db.get_patient_by_id(patient_id)
        user_db.close()
        
        if patient:
            # Remove sensitive data
            patient.pop('pin', None)
            
            # Convert date objects
            if patient.get('date_of_birth'):
                patient['date_of_birth'] = str(patient['date_of_birth'])
            if patient.get('created_at'):
                patient['created_at'] = str(patient['created_at'])
            if patient.get('updated_at'):
                patient['updated_at'] = str(patient['updated_at'])
            
            return jsonify({
                'success': True,
                'patient': patient
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Patient not found'
            }), 404
            
    except Exception as e:
        print(f"Error retrieving patient: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


# ==================== DOCTOR ROUTES ====================

@users_bp.route('/api/doctors/register', methods=['POST'])
def register_doctor():
    """
    Register a new doctor
    
    Expected JSON body:
    {
        "licenseId": "MED-12345",
        "fullName": "Dr. John Smith",
        "specialization": "Cardiologist",
        "password": "SecurePass@123"
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['licenseId', 'fullName', 'specialization', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'{field} is required'
                }), 400
        
        # Validate license ID (min 5 chars)
        if len(data['licenseId']) < 5:
            return jsonify({
                'success': False,
                'error': 'License ID must be at least 5 characters'
            }), 400
        
        # Validate full name (min 3 chars)
        if len(data['fullName']) < 3:
            return jsonify({
                'success': False,
                'error': 'Full name must be at least 3 characters'
            }), 400
        
        # Validate password strength
        is_valid, error_msg = validate_password(data['password'])
        if not is_valid:
            return jsonify({
                'success': False,
                'error': error_msg
            }), 400
        
        # Check if doctor already exists
        user_db = UserDB()
        
        if user_db.doctor_exists(data['licenseId']):
            user_db.close()
            return jsonify({
                'success': False,
                'error': 'A doctor with this license ID already exists'
            }), 409
        
        # Create doctor
        doctor_id = user_db.create_doctor(data)
        user_db.close()
        
        if doctor_id:
            return jsonify({
                'success': True,
                'message': 'Doctor registered successfully. Pending verification.',
                'doctorId': doctor_id
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to register doctor'
            }), 500
            
    except Exception as e:
        print(f"Error in doctor registration: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@users_bp.route('/api/doctors/login', methods=['POST'])
def login_doctor():
    """
    Doctor login
    
    Expected JSON body:
    {
        "licenseId": "MED-12345",
        "password": "SecurePass@123"
    }
    """
    try:
        data = request.get_json()
        
        license_id = data.get('licenseId')
        password = data.get('password')
        
        if not license_id or not password:
            return jsonify({
                'success': False,
                'error': 'License ID and password are required'
            }), 400
        
        user_db = UserDB()
        doctor = user_db.verify_doctor_password(license_id, password)
        user_db.close()
        
        if doctor:
            # Convert datetime objects to strings
            if doctor.get('created_at'):
                doctor['created_at'] = str(doctor['created_at'])
            if doctor.get('updated_at'):
                doctor['updated_at'] = str(doctor['updated_at'])
            
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'doctor': {
                    'id': doctor['id'],
                    'licenseId': doctor['license_id'],
                    'fullName': doctor['full_name'],
                    'specialization': doctor['specialization'],
                    'verified': doctor['verified']
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid license ID or password'
            }), 401
            
    except Exception as e:
        print(f"Error in doctor login: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@users_bp.route('/api/doctors', methods=['GET'])
def get_all_doctors():
    """Get all registered doctors"""
    try:
        user_db = UserDB()
        doctors = user_db.get_all_doctors()
        user_db.close()
        
        # Convert datetime objects
        for doctor in doctors:
            if doctor.get('created_at'):
                doctor['created_at'] = str(doctor['created_at'])
        
        return jsonify({
            'success': True,
            'doctors': doctors
        }), 200
        
    except Exception as e:
        print(f"Error retrieving doctors: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@users_bp.route('/api/doctors/<doctor_id>', methods=['GET'])
def get_doctor(doctor_id):
    """Get a specific doctor by ID"""
    try:
        user_db = UserDB()
        doctor = user_db.get_doctor_by_id(doctor_id)
        user_db.close()
        
        if doctor:
            # Remove sensitive data
            doctor.pop('password', None)
            
            # Convert datetime objects
            if doctor.get('created_at'):
                doctor['created_at'] = str(doctor['created_at'])
            if doctor.get('updated_at'):
                doctor['updated_at'] = str(doctor['updated_at'])
            
            return jsonify({
                'success': True,
                'doctor': doctor
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Doctor not found'
            }), 404
            
    except Exception as e:
        print(f"Error retrieving doctor: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@users_bp.route('/api/doctors/<doctor_id>/verify', methods=['POST'])
def verify_doctor_account(doctor_id):
    """Mark a doctor as verified (admin only)"""
    try:
        user_db = UserDB()
        success = user_db.verify_doctor(doctor_id)
        user_db.close()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Doctor verified successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Doctor not found or already verified'
            }), 404
            
    except Exception as e:
        print(f"Error verifying doctor: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500
