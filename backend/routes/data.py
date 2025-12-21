"""
Data Routes for Reports, Consents, and Assignments
Handles persistent storage in MySQL
"""

from flask import Blueprint, request, jsonify
from db_config import PatientReportDB

data_bp = Blueprint('data', __name__)


# ==================== REPORT ROUTES ====================

@data_bp.route('/api/reports', methods=['POST'])
def create_report():
    """Create a new patient report"""
    try:
        data = request.get_json()
        
        if not data.get('patientId'):
            return jsonify({
                'success': False,
                'error': 'patientId is required'
            }), 400
        
        db = PatientReportDB()
        report_id = db.create_report(data)
        db.close()
        
        if report_id:
            return jsonify({
                'success': True,
                'reportId': report_id
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to create report'
            }), 500
            
    except Exception as e:
        print(f"Error creating report: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@data_bp.route('/api/patients/<patient_id>/reports', methods=['GET'])
def get_patient_reports(patient_id):
    """Get all reports for a patient"""
    try:
        db = PatientReportDB()
        reports = db.get_reports_by_patient_id(patient_id)
        db.close()
        
        return jsonify({
            'success': True,
            'reports': reports
        }), 200
        
    except Exception as e:
        print(f"Error retrieving reports: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@data_bp.route('/api/reports/<report_id>', methods=['GET'])
def get_report(report_id):
    """Get a specific report"""
    try:
        db = PatientReportDB()
        report = db.get_report_by_id(report_id)
        db.close()
        
        if report:
            return jsonify({
                'success': True,
                'report': report
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Report not found'
            }), 404
            
    except Exception as e:
        print(f"Error retrieving report: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@data_bp.route('/api/reports/<report_id>/status', methods=['PUT'])
def update_report_status(report_id):
    """Update report status"""
    try:
        data = request.get_json()
        status = data.get('status')
        
        if not status:
            return jsonify({
                'success': False,
                'error': 'status is required'
            }), 400
        
        db = PatientReportDB()
        success = db.update_report_status(report_id, status)
        db.close()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Status updated'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Report not found'
            }), 404
            
    except Exception as e:
        print(f"Error updating status: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@data_bp.route('/api/reports/<report_id>/ai', methods=['PUT'])
def update_report_ai_data(report_id):
    """Update report with AI-generated data"""
    try:
        data = request.get_json()
        
        db = PatientReportDB()
        success = db.update_report_ai_data(report_id, data)
        db.close()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'AI data updated'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Report not found'
            }), 404
            
    except Exception as e:
        print(f"Error updating AI data: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


# ==================== CONSENT ROUTES ====================

@data_bp.route('/api/consents', methods=['POST'])
def create_consent():
    """Create a new consent"""
    try:
        data = request.get_json()
        
        required = ['patientId', 'doctorId', 'permissions', 'startDate', 'endDate']
        for field in required:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'{field} is required'
                }), 400
        
        db = PatientReportDB()
        consent_id = db.create_consent(data)
        db.close()
        
        if consent_id:
            return jsonify({
                'success': True,
                'consentId': consent_id
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to create consent'
            }), 500
            
    except Exception as e:
        print(f"Error creating consent: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@data_bp.route('/api/patients/<patient_id>/consents', methods=['GET'])
def get_patient_consents(patient_id):
    """Get all consents for a patient"""
    try:
        db = PatientReportDB()
        consents = db.get_consents_by_patient_id(patient_id)
        db.close()
        
        return jsonify({
            'success': True,
            'consents': consents
        }), 200
        
    except Exception as e:
        print(f"Error retrieving consents: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@data_bp.route('/api/doctors/<doctor_id>/consents', methods=['GET'])
def get_doctor_consents(doctor_id):
    """Get all consents for a doctor"""
    try:
        db = PatientReportDB()
        consents = db.get_consents_by_doctor_id(doctor_id)
        db.close()
        
        return jsonify({
            'success': True,
            'consents': consents
        }), 200
        
    except Exception as e:
        print(f"Error retrieving consents: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@data_bp.route('/api/consents/<consent_id>/revoke', methods=['POST'])
def revoke_consent(consent_id):
    """Revoke a consent"""
    try:
        db = PatientReportDB()
        success = db.revoke_consent(consent_id)
        db.close()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Consent revoked'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Consent not found'
            }), 404
            
    except Exception as e:
        print(f"Error revoking consent: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


# ==================== ASSIGNMENT ROUTES ====================

@data_bp.route('/api/assignments', methods=['POST'])
def create_assignment():
    """Create a doctor-patient assignment"""
    try:
        data = request.get_json()
        
        if not data.get('doctorId') or not data.get('patientId'):
            return jsonify({
                'success': False,
                'error': 'doctorId and patientId are required'
            }), 400
        
        db = PatientReportDB()
        assignment_id = db.create_assignment(data)
        db.close()
        
        if assignment_id:
            return jsonify({
                'success': True,
                'assignmentId': assignment_id
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to create assignment'
            }), 500
            
    except Exception as e:
        print(f"Error creating assignment: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@data_bp.route('/api/doctors/<doctor_id>/assignments', methods=['GET'])
def get_doctor_assignments(doctor_id):
    """Get all patients assigned to a doctor"""
    try:
        db = PatientReportDB()
        assignments = db.get_assignments_by_doctor_id(doctor_id)
        db.close()
        
        return jsonify({
            'success': True,
            'assignments': assignments
        }), 200
        
    except Exception as e:
        print(f"Error retrieving assignments: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@data_bp.route('/api/patients/<patient_id>/assignments', methods=['GET'])
def get_patient_assignments(patient_id):
    """Get all doctors assigned to a patient"""
    try:
        db = PatientReportDB()
        assignments = db.get_assignments_by_patient_id(patient_id)
        db.close()
        
        return jsonify({
            'success': True,
            'assignments': assignments
        }), 200
        
    except Exception as e:
        print(f"Error retrieving assignments: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500
