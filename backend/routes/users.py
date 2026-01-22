"""
User Authentication Routes
Handles patient and doctor registration/login with MySQL storage
"""

from flask import Blueprint, request, jsonify
import re
from db_config import UserDB
from utils.email_service import EmailService

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
    Initiate patient registration with email verification
    
    Expected JSON body:
    {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "1234567890",
        "dateOfBirth": "1990-05-15",
        "pin": "123456"
    }
    
    This will send a verification code to the email.
    Use /api/patients/verify-email to complete registration.
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
        
        # Generate verification code
        email_service = EmailService()
        verification_code = EmailService.generate_verification_code()
        
        # Store verification data
        verification_data = {
            **data,
            'verification_code': verification_code
        }
        
        verification_id = user_db.create_email_verification(verification_data)
        
        if not verification_id:
            user_db.close()
            return jsonify({
                'success': False,
                'error': 'Failed to initiate registration'
            }), 500
        
        # Send verification email
        email_sent = email_service.send_verification_email(
            to_email=data['email'],
            first_name=data['firstName'],
            verification_code=verification_code,
            pin=data['pin']
        )
        
        user_db.close()
        
        if email_sent:
            return jsonify({
                'success': True,
                'message': 'Verification code sent to your email',
                'email': data['email'],
                'requiresVerification': True
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to send verification email. Please check your email address or try again later.'
            }), 500
            
    except Exception as e:
        print(f"Error in patient registration: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@users_bp.route('/api/patients/verify-email', methods=['POST'])
def verify_email():
    """
    Verify email with the verification code and complete registration
    
    Expected JSON body:
    {
        "email": "john@example.com",
        "code": "123456"
    }
    """
    try:
        data = request.get_json()
        
        email = data.get('email')
        code = data.get('code')
        
        if not email or not code:
            return jsonify({
                'success': False,
                'error': 'Email and verification code are required'
            }), 400
        
        user_db = UserDB()
        
        # Verify the code
        verification = user_db.verify_email_code(email, code)
        
        if not verification:
            user_db.close()
            return jsonify({
                'success': False,
                'error': 'Invalid or expired verification code'
            }), 400
        
        # Create the patient from verification data
        patient_id = user_db.create_patient_from_verification(verification)
        
        if not patient_id:
            user_db.close()
            return jsonify({
                'success': False,
                'error': 'Failed to complete registration'
            }), 500
        
        # Clean up verification record
        user_db.delete_verification(email)
        
        # Send welcome email (non-blocking, don't fail if email fails)
        try:
            email_service = EmailService()
            email_service.send_welcome_email(email, verification['first_name'])
        except Exception:
            pass  # Silently ignore welcome email failures
        
        user_db.close()
        
        return jsonify({
            'success': True,
            'message': 'Email verified and registration complete',
            'patientId': patient_id
        }), 201
        
    except Exception as e:
        print(f"Error in email verification: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@users_bp.route('/api/patients/resend-verification', methods=['POST'])
def resend_verification():
    """
    Resend verification code to email
    
    Expected JSON body:
    {
        "email": "john@example.com"
    }
    """
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({
                'success': False,
                'error': 'Email is required'
            }), 400
        
        user_db = UserDB()
        
        # Get pending verification
        verification = user_db.get_pending_verification(email)
        
        if not verification:
            user_db.close()
            return jsonify({
                'success': False,
                'error': 'No pending verification found. Please register again.'
            }), 404
        
        # Generate new code and update
        email_service = EmailService()
        new_code = EmailService.generate_verification_code()
        
        # Create new verification with updated code
        verification_data = {
            'email': email,
            'firstName': verification['first_name'],
            'lastName': verification['last_name'],
            'phone': verification['phone'],
            'dateOfBirth': str(verification['date_of_birth']),
            'pin': 'placeholder',  # Will be replaced with existing hash
            'verification_code': new_code
        }
        
        # Delete old and create new
        user_db.delete_verification(email)
        
        # Need to recreate with original PIN hash - get from verification record
        from db_config import DatabaseConnection
        from mysql.connector import Error
        import uuid
        from datetime import datetime, timedelta
        
        try:
            db = DatabaseConnection()
            conn = db.get_connection()
            cursor = conn.cursor()
            
            verification_id = str(uuid.uuid4())
            expires_at = datetime.now() + timedelta(minutes=10)
            
            query = """
                INSERT INTO email_verifications (
                    id, email, verification_code, pin, first_name, last_name, 
                    phone, date_of_birth, expires_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            values = (
                verification_id,
                email,
                new_code,
                verification['pin'],  # Use existing hashed PIN
                verification['first_name'],
                verification['last_name'],
                verification['phone'],
                verification['date_of_birth'],
                expires_at
            )
            
            cursor.execute(query, values)
            conn.commit()
            cursor.close()
            db.disconnect()
            
        except Error as e:
            print(f"Error recreating verification: {e}")
            user_db.close()
            return jsonify({
                'success': False,
                'error': 'Failed to resend verification'
            }), 500
        
        # Send new verification email
        # Note: We can't show the original PIN since it's hashed
        email_sent = email_service.send_verification_email(
            to_email=email,
            first_name=verification['first_name'],
            verification_code=new_code,
            pin='******'  # Can't recover original PIN
        )
        
        user_db.close()
        
        if email_sent:
            return jsonify({
                'success': True,
                'message': 'New verification code sent'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to send verification email'
            }), 500
            
    except Exception as e:
        print(f"Error resending verification: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500
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


@users_bp.route('/api/patients/<patient_id>', methods=['DELETE'])
def delete_patient_account(patient_id):
    """
    Delete a patient account and all related data
    
    This will permanently delete:
    - Patient profile
    - All medical reports
    - All consents
    - All doctor assignments
    - Email verification records
    """
    try:
        user_db = UserDB()
        
        # Verify patient exists
        patient = user_db.get_patient_by_id(patient_id)
        if not patient:
            user_db.close()
            return jsonify({
                'success': False,
                'error': 'Patient not found'
            }), 404
        
        # Delete patient and all related data
        success = user_db.delete_patient(patient_id)
        user_db.close()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Account deleted successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to delete account'
            }), 500
            
    except Exception as e:
        print(f"Error deleting patient account: {e}")
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


# ==================== FINGERPRINT/BIOMETRIC ROUTES ====================

@users_bp.route('/api/patients/fingerprint/register', methods=['POST'])
def register_fingerprint():
    """
    Register WebAuthn fingerprint credential for a patient
    
    Expected JSON body:
    {
        "email": "patient@example.com",
        "credentialId": "base64-encoded-credential-id",
        "publicKey": "base64-encoded-public-key"
    }
    """
    try:
        data = request.get_json()
        
        email = data.get('email')
        credential_id = data.get('credentialId')
        public_key = data.get('publicKey')
        
        if not email or not credential_id or not public_key:
            return jsonify({
                'success': False,
                'error': 'Email, credentialId, and publicKey are required'
            }), 400
        
        user_db = UserDB()
        
        # Check if patient exists
        if not user_db.patient_exists(email):
            user_db.close()
            return jsonify({
                'success': False,
                'error': 'Patient not found'
            }), 404
        
        # Register fingerprint
        success = user_db.register_fingerprint(email, credential_id, public_key)
        user_db.close()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Fingerprint registered successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to register fingerprint'
            }), 500
            
    except Exception as e:
        print(f"Error registering fingerprint: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@users_bp.route('/api/patients/fingerprint/challenge', methods=['POST'])
def get_fingerprint_challenge():
    """
    Generate a WebAuthn challenge for fingerprint authentication
    
    Expected JSON body:
    {
        "email": "patient@example.com"
    }
    """
    try:
        import base64
        import secrets
        
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({
                'success': False,
                'error': 'Email is required'
            }), 400
        
        user_db = UserDB()
        
        # Check if patient has fingerprint registered
        credential = user_db.get_fingerprint_credential(email)
        user_db.close()
        
        if not credential:
            return jsonify({
                'success': False,
                'error': 'No fingerprint registered for this account',
                'fingerprintRegistered': False
            }), 404
        
        # Generate a random challenge
        challenge = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
        
        return jsonify({
            'success': True,
            'challenge': challenge,
            'credentialId': credential['credential_id'],
            'fingerprintRegistered': True
        }), 200
        
    except Exception as e:
        print(f"Error generating fingerprint challenge: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@users_bp.route('/api/patients/fingerprint/verify', methods=['POST'])
def verify_fingerprint():
    """
    Verify WebAuthn fingerprint authentication
    
    Expected JSON body:
    {
        "email": "patient@example.com",
        "credentialId": "base64-encoded-credential-id",
        "authenticatorData": "base64-encoded-authenticator-data",
        "signature": "base64-encoded-signature",
        "clientDataJSON": "base64-encoded-client-data"
    }
    """
    try:
        data = request.get_json()
        
        email = data.get('email')
        credential_id = data.get('credentialId')
        
        if not email or not credential_id:
            return jsonify({
                'success': False,
                'error': 'Email and credentialId are required'
            }), 400
        
        user_db = UserDB()
        
        # Verify the credential ID matches the stored one
        patient = user_db.verify_fingerprint_credential(email, credential_id)
        user_db.close()
        
        if patient:
            # Convert date objects to strings for JSON serialization
            if patient.get('date_of_birth'):
                patient['date_of_birth'] = str(patient['date_of_birth'])
            
            return jsonify({
                'success': True,
                'message': 'Fingerprint verified successfully',
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
                'error': 'Fingerprint verification failed'
            }), 401
            
    except Exception as e:
        print(f"Error verifying fingerprint: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@users_bp.route('/api/patients/fingerprint/status/<email>', methods=['GET'])
def get_fingerprint_status(email):
    """Check if a patient has fingerprint registered"""
    try:
        user_db = UserDB()
        has_fingerprint = user_db.has_fingerprint_registered(email)
        user_db.close()
        
        return jsonify({
            'success': True,
            'fingerprintRegistered': has_fingerprint
        }), 200
        
    except Exception as e:
        print(f"Error checking fingerprint status: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@users_bp.route('/api/patients/fingerprint/registration-options', methods=['POST'])
def get_registration_options():
    """
    Generate WebAuthn registration options for fingerprint enrollment
    
    Expected JSON body:
    {
        "email": "patient@example.com",
        "firstName": "John",
        "lastName": "Doe"
    }
    """
    try:
        import base64
        import secrets
        
        data = request.get_json()
        email = data.get('email')
        first_name = data.get('firstName', '')
        last_name = data.get('lastName', '')
        
        if not email:
            return jsonify({
                'success': False,
                'error': 'Email is required'
            }), 400
        
        # Generate a random challenge
        challenge = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
        
        # Generate a user ID based on email
        user_id = base64.urlsafe_b64encode(email.encode()).decode('utf-8').rstrip('=')
        
        # WebAuthn registration options
        options = {
            'challenge': challenge,
            'rp': {
                'name': 'HealthVault',
                'id': None  # Will be set by frontend based on current domain
            },
            'user': {
                'id': user_id,
                'name': email,
                'displayName': f"{first_name} {last_name}".strip() or email
            },
            'pubKeyCredParams': [
                {'type': 'public-key', 'alg': -7},   # ES256
                {'type': 'public-key', 'alg': -257}  # RS256
            ],
            'authenticatorSelection': {
                'authenticatorAttachment': 'platform',  # Use platform authenticator (fingerprint)
                'userVerification': 'required',
                'residentKey': 'preferred'
            },
            'timeout': 60000,
            'attestation': 'none'
        }
        
        return jsonify({
            'success': True,
            'options': options
        }), 200
        
    except Exception as e:
        print(f"Error generating registration options: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500
