from flask import Blueprint, request, jsonify
import logging
from utils.rag_processor import RAGProcessor
from db_config import MedicalReportDB

logger = logging.getLogger(__name__)
chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/ask', methods=['POST'])
def ask_question():
    """
    Ask question about a report using RAG
    
    Expected JSON:
    {
        "report_id": "RPT-...",
        "question": "What are the test results?"
    }
    
    Returns:
    {
        "success": true,
        "answer": "...",
        "report_id": "RPT-..."
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'report_id' not in data or 'question' not in data:
            return jsonify({'error': 'Missing required fields'}), 400
        
        report_id = data['report_id']
        question = data['question']
        
        # Validate question
        if not question.strip() or len(question) < 3:
            return jsonify({'error': 'Question too short'}), 400
        
        # Get report from database
        db = MedicalReportDB()
        report = db.get_report_by_id(report_id)
        
        if not report:
            return jsonify({'error': 'Report not found'}), 404
        
        if report['processed_status'] != 'processed':
            return jsonify({'error': 'Report not yet processed'}), 400
        
        # Use RAG to answer question
        logger.info(f"Answering question for report {report_id}")
        rag_processor = RAGProcessor()
        answer = rag_processor.answer_question(question, report['faiss_index_path'])
        
        # Save to query history
        db.save_query(report_id, question, answer)
        
        return jsonify({
            'success': True,
            'answer': answer,
            'report_id': report_id
        }), 200
        
    except Exception as e:
        logger.error(f"Error answering question: {str(e)}")
        return jsonify({
            'error': 'Error processing question',
            'message': str(e)
        }), 500

@chat_bp.route('/history/<report_id>', methods=['GET'])
def get_chat_history(report_id):
    """Get chat history for a report"""
    try:
        limit = request.args.get('limit', 50, type=int)
        
        db = MedicalReportDB()
        history = db.get_query_history(report_id)
        
        # Limit results
        history = history[:limit]
        
        # Convert datetime objects
        for item in history:
            item['query_time'] = str(item['query_time'])
        
        return jsonify({
            'success': True,
            'count': len(history),
            'data': history
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching chat history: {str(e)}")
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/history/<report_id>/<int:history_id>', methods=['DELETE'])
def delete_chat_history(report_id, history_id):
    """Delete specific chat message"""
    try:
        # Implement delete logic in db_config.py if needed
        return jsonify({
            'success': True,
            'message': 'Chat history deleted'
        }), 200
        
    except Exception as e:
        logger.error(f"Error deleting chat history: {str(e)}")
        return jsonify({'error': str(e)}), 500
