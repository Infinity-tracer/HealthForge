from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import logging
import os
from datetime import datetime
import uuid

from utils.pdf_processor import PDFProcessor, TextSplitter
from utils.rag_processor import RAGProcessor
from db_config import MedicalReportDB

logger = logging.getLogger(__name__)
reports_bp = Blueprint('reports', __name__)

ALLOWED_EXTENSIONS = {'pdf'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1).lower() in ALLOWED_EXTENSIONS

@reports_bp.route('/upload', methods=['POST'])
def upload_report():
    """
    Upload and process medical report
    
    Expected:
    - file: PDF file
    - patient_id: (optional) Patient ID for linking
    
    Returns:
    {
        "success": true,
        "report_id": "RPT-timestamp-uuid",
        "message": "Report processed successfully",
        "patient_name": "...",
        "diagnosis": "...",
        "summary": "..."
    }
    """
    try:
        # Validate request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Only PDF files allowed'}), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_length = file.tell()
        file.seek(0)
        
        if file_length > MAX_FILE_SIZE:
            return jsonify({'error': 'File too large'}), 413
        
        logger.info(f"Processing uploaded file: {file.filename}")
        
        # Extract PDF text
        pdf_processor = PDFProcessor()
        raw_text, filename = pdf_processor.extract_text(file)
        
        # Split text into chunks
        text_splitter = TextSplitter()
        text_chunks = text_splitter.split_text(raw_text)
        
        # Create vector store
        rag_processor = RAGProcessor()
        report_uuid = str(uuid.uuid4())[:8].upper()
        faiss_path = f"faiss_index_{report_uuid}"
        faiss_path = rag_processor.create_vector_store(text_chunks, faiss_path)
        
        # Extract medical information
        logger.info("Extracting medical information...")
        extracted_info = rag_processor.extract_medical_info(raw_text)
        
        # Generate summary
        logger.info("Generating summary...")
        summary = rag_processor.generate_summary(raw_text)
        
        # Prepare database record
        report_data = {
            'file_name': filename,
            'patient_name': extracted_info.get('patient_name'),
            'patient_age': extracted_info.get('patient_age'),
            'patient_gender': extracted_info.get('patient_gender', 'Unknown'),
            'patient_id': request.form.get('patient_id') or extracted_info.get('patient_id'),
            'report_date': extracted_info.get('report_date'),
            'report_type': extracted_info.get('report_type', 'Medical Report'),
            'hospital_name': extracted_info.get('hospital_name'),
            'doctor_name': extracted_info.get('doctor_name'),
            'summary': summary if summary else "Report processed. Ask questions to explore.",
            'diagnosis': extracted_info.get('diagnosis'),
            'key_findings': extracted_info.get('key_findings'),
            'test_results': extracted_info.get('test_results', []),
            'recommendations': extracted_info.get('recommendations'),
            'raw_text': raw_text[:65000],
            'faiss_index_path': faiss_path,
            'processed_status': 'processed'
        }
        
        # Save to database
        db = MedicalReportDB()
        report_id = db.save_report(report_data)
        
        # Save test results if available
        if extracted_info.get('test_results'):
            db.save_test_results(report_id, extracted_info.get('test_results'))
        
        logger.info(f"Report saved with ID: {report_id}")
        
        return jsonify({
            'success': True,
            'report_id': report_id,
            'message': 'Report processed successfully',
            'patient_name': extracted_info.get('patient_name'),
            'diagnosis': extracted_info.get('diagnosis'),
            'summary': summary[:500] + "..." if len(summary) > 500 else summary
        }), 200
        
    except Exception as e:
        logger.error(f"Error uploading report: {str(e)}")
        return jsonify({
            'error': 'Error processing report',
            'message': str(e)
        }), 500

@reports_bp.route('/<report_id>', methods=['GET'])
def get_report(report_id):
    """Get report details by ID"""
    try:
        db = MedicalReportDB()
        report = db.get_report_by_id(report_id)
        
        if not report:
            return jsonify({'error': 'Report not found'}), 404
        
        # Convert datetime objects to strings
        report['upload_date'] = str(report['upload_date'])
        report['last_updated'] = str(report['last_updated'])
        
        return jsonify({
            'success': True,
            'data': report
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching report: {str(e)}")
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/patient/<patient_id>', methods=['GET'])
def get_patient_reports(patient_id):
    """Get all reports for a patient"""
    try:
        db = MedicalReportDB()
        # Implement search for patient_id in database
        results = db.search_reports(patient_id)
        
        return jsonify({
            'success': True,
            'count': len(results),
            'data': results
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching patient reports: {str(e)}")
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/<report_id>', methods=['DELETE'])
def delete_report(report_id):
    """Delete a report"""
    try:
        db = MedicalReportDB()
        success = db.delete_report(report_id)
        
        if not success:
            return jsonify({'error': 'Report not found'}), 404
        
        logger.info(f"Report deleted: {report_id}")
        return jsonify({
            'success': True,
            'message': 'Report deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error deleting report: {str(e)}")
        return jsonify({'error': str(e)}), 500
