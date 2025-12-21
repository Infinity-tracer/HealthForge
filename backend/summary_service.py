"""
Flask API for Medical Report Processing - Summary Service
Provides endpoint to upload reports and get summaries
Stores reports in MySQL database (same tables as Streamlit app)
Run this alongside the main backend for AI summarization
Port: 8004
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from PyPDF2 import PdfReader
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
import os
import json
import tempfile
from datetime import datetime
from db_config import MedicalReportDB

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure upload settings
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Enable CORS for Node.js server calls
CORS(app, origins=["http://localhost:5000", "http://localhost:3000", "*"])

# Initialize database
report_db = MedicalReportDB()


def extract_text_from_pdf(pdf_file):
    """Extract text from a PDF file"""
    text = ""
    pdf_reader = PdfReader(pdf_file)
    for page in pdf_reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text
    return text


def extract_medical_info(raw_text: str) -> dict:
    """
    Use Gemini to extract structured medical information from the report text
    """
    extraction_prompt = f"""
    Analyze the following medical report text and extract the information in JSON format.
    If any information is not found, use null for that field.
    
    Extract the following fields:
    - patient_name: Full name of the patient
    - patient_age: Age as a number
    - patient_gender: Male, Female, or Other
    - patient_id: Patient ID or registration number
    - report_date: Date in YYYY-MM-DD format
    - report_type: Type of medical report (e.g., Blood Test, X-Ray, MRI, CT Scan, Pathology, General Checkup)
    - hospital_name: Name of the hospital or clinic
    - doctor_name: Name of the doctor
    - diagnosis: Main diagnosis or findings
    - key_findings: Important observations (as a string)
    - recommendations: Doctor's recommendations or advice
    - test_results: Array of test results, each with:
        - test_name: Name of the test
        - test_value: Result value
        - unit: Unit of measurement
        - normal_range: Normal range for reference
        - status: Normal, Abnormal, or Critical
    
    Medical Report Text:
    {raw_text[:15000]}
    
    Return ONLY valid JSON, no additional text or explanation.
    """
    
    try:
        model = ChatGoogleGenerativeAI(model="models/gemini-2.5-flash", temperature=0.1)
        response = model.invoke(extraction_prompt)
        response_text = response.content
        
        # Clean up the response to get valid JSON
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        
        extracted_info = json.loads(response_text.strip())
        return extracted_info
    except Exception as e:
        print(f"Error extracting medical info: {e}")
        return {}


def generate_summary(raw_text: str) -> str:
    """
    Use Gemini to generate a comprehensive summary of the medical report
    """
    summary_prompt = f"""
    Generate a comprehensive medical summary from the following report text.
    The summary should include:
    1. Patient Overview (demographics, reason for visit)
    2. Key Test Results and Values
    3. Main Diagnosis/Findings
    4. Notable Abnormalities (if any)
    5. Recommendations and Follow-up Actions
    
    Keep the summary concise but informative (200-400 words).
    
    Medical Report Text:
    {raw_text[:15000]}
    
    Summary:
    """
    
    try:
        model = ChatGoogleGenerativeAI(model="models/gemini-2.5-flash", temperature=0.3)
        response = model.invoke(summary_prompt)
        return response.content
    except Exception as e:
        print(f"Error generating summary: {e}")
        return "Summary generation failed"


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "message": "Medical Report Summary API is running",
        "timestamp": datetime.now().isoformat()
    })


@app.route('/api/report/summary', methods=['POST'])
def get_report_summary():
    """
    Endpoint to upload a medical report and get a summary
    
    Accepts:
        - PDF file upload (multipart/form-data with 'file' field)
        - Raw text in JSON body ({"text": "report text here"})
    
    Returns:
        JSON with extracted information and summary
    """
    try:
        raw_text = None
        file_name = None
        
        # Check if file was uploaded
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({
                    "success": False,
                    "error": "No file selected"
                }), 400
            
            if not file.filename.lower().endswith('.pdf'):
                return jsonify({
                    "success": False,
                    "error": "Only PDF files are supported"
                }), 400
            
            file_name = file.filename
            
            # Save to temp file and extract text
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                file.save(tmp.name)
                tmp_path = tmp.name
            
            try:
                with open(tmp_path, 'rb') as f:
                    raw_text = extract_text_from_pdf(f)
            finally:
                os.unlink(tmp_path)  # Clean up temp file
        
        # Check if raw text was provided in JSON body
        elif request.is_json:
            data = request.get_json()
            raw_text = data.get('text', '')
            file_name = data.get('file_name', 'text_input')
        
        else:
            return jsonify({
                "success": False,
                "error": "No file or text provided. Send a PDF file or JSON with 'text' field."
            }), 400
        
        if not raw_text or len(raw_text.strip()) == 0:
            return jsonify({
                "success": False,
                "error": "No text could be extracted from the report"
            }), 400
        
        # Extract medical information
        extracted_info = extract_medical_info(raw_text)
        
        # Generate summary
        summary = generate_summary(raw_text)
        
        # Save to MySQL database (same tables as Streamlit app)
        report_id = None
        try:
            report_data = {
                'file_name': file_name,
                'patient_name': extracted_info.get('patient_name'),
                'patient_age': extracted_info.get('patient_age'),
                'patient_gender': extracted_info.get('patient_gender', 'Unknown'),
                'patient_id': extracted_info.get('patient_id'),
                'report_date': extracted_info.get('report_date'),
                'report_type': extracted_info.get('report_type', 'Medical Report'),
                'hospital_name': extracted_info.get('hospital_name'),
                'doctor_name': extracted_info.get('doctor_name'),
                'summary': summary if summary and summary != "Summary generation failed" else f"Report uploaded on {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                'diagnosis': extracted_info.get('diagnosis'),
                'key_findings': extracted_info.get('key_findings'),
                'test_results': extracted_info.get('test_results', []),
                'recommendations': extracted_info.get('recommendations'),
                'raw_text': raw_text[:65000],  # Store raw text for reference
                'faiss_index_path': None  # Can be set if vector store is created
            }
            
            report_id = report_db.save_report(report_data)
            print(f"Report saved to MySQL with ID: {report_id}")
            
            # Save individual test results if available
            if extracted_info.get('test_results') and report_id:
                report_db.save_test_results(report_id, extracted_info.get('test_results'))
                print(f"Test results saved for report: {report_id}")
                
        except Exception as db_error:
            print(f"Warning: Could not save to MySQL database: {db_error}")
            # Continue without database save - still return the processed data
        
        # Build response
        response_data = {
            "success": True,
            "file_name": file_name,
            "report_id": report_id,  # MySQL report ID
            "processed_at": datetime.now().isoformat(),
            "text_length": len(raw_text),
            "summary": summary,
            "extracted_info": {
                "patient_name": extracted_info.get('patient_name'),
                "patient_age": extracted_info.get('patient_age'),
                "patient_gender": extracted_info.get('patient_gender'),
                "patient_id": extracted_info.get('patient_id'),
                "report_date": extracted_info.get('report_date'),
                "report_type": extracted_info.get('report_type'),
                "hospital_name": extracted_info.get('hospital_name'),
                "doctor_name": extracted_info.get('doctor_name'),
                "diagnosis": extracted_info.get('diagnosis'),
                "key_findings": extracted_info.get('key_findings'),
                "recommendations": extracted_info.get('recommendations'),
                "test_results": extracted_info.get('test_results', [])
            }
        }
        
        return jsonify(response_data), 200
    
    except Exception as e:
        print(f"Error processing report: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/report/extract', methods=['POST'])
def extract_info_only():
    """
    Endpoint to extract only structured information (no summary)
    Faster than full summary endpoint
    """
    try:
        raw_text = None
        
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '' or not file.filename.lower().endswith('.pdf'):
                return jsonify({"success": False, "error": "Invalid file"}), 400
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                file.save(tmp.name)
                tmp_path = tmp.name
            
            try:
                with open(tmp_path, 'rb') as f:
                    raw_text = extract_text_from_pdf(f)
            finally:
                os.unlink(tmp_path)
        
        elif request.is_json:
            raw_text = request.get_json().get('text', '')
        
        if not raw_text:
            return jsonify({"success": False, "error": "No text provided"}), 400
        
        extracted_info = extract_medical_info(raw_text)
        
        return jsonify({
            "success": True,
            "extracted_info": extracted_info
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/report/summarize', methods=['POST'])
def summarize_only():
    """
    Endpoint to generate only the summary (no structured extraction)
    """
    try:
        raw_text = None
        
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '' or not file.filename.lower().endswith('.pdf'):
                return jsonify({"success": False, "error": "Invalid file"}), 400
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                file.save(tmp.name)
                tmp_path = tmp.name
            
            try:
                with open(tmp_path, 'rb') as f:
                    raw_text = extract_text_from_pdf(f)
            finally:
                os.unlink(tmp_path)
        
        elif request.is_json:
            raw_text = request.get_json().get('text', '')
        
        if not raw_text:
            return jsonify({"success": False, "error": "No text provided"}), 400
        
        summary = generate_summary(raw_text)
        
        return jsonify({
            "success": True,
            "summary": summary
        }), 200
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    print("Starting Medical Report Summary API...")
    print("Endpoints:")
    print("  GET  /api/health          - Health check")
    print("  POST /api/report/summary  - Full summary with extraction")
    print("  POST /api/report/extract  - Extract structured info only")
    print("  POST /api/report/summarize - Generate summary only")
    app.run(debug=True, host='0.0.0.0', port=8004)
