"""
FastAPI Medical Report RAG Service
Port: 8001
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv
import tempfile

from services.pdf_processor import PDFProcessor
from services.rag_engine import RAGEngine
from services.medical_extractor import MedicalExtractor

load_dotenv()

app = FastAPI(title="HealthForge RAG Service", version="1.0.0")

# CORS - Allow your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",  # Your Vite server
        "http://localhost:5173",  # Alternative Vite port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
pdf_processor = PDFProcessor()
rag_engine = RAGEngine()
medical_extractor = MedicalExtractor()


# Request/Response Models
class ChatRequest(BaseModel):
    report_id: str
    question: str


class ChatResponse(BaseModel):
    answer: str
    confidence: float


class ReportAnalysis(BaseModel):
    report_id: str
    patient_name: Optional[str]
    patient_age: Optional[int]
    patient_gender: Optional[str]
    report_type: Optional[str]
    report_date: Optional[str]
    diagnosis: Optional[str]
    summary: str
    key_findings: Optional[str]
    recommendations: Optional[str]
    test_results: List[dict]
    faiss_path: str


@app.get("/")
async def health_check():
    return {
        "service": "HealthForge RAG",
        "status": "running",
        "version": "1.0.0"
    }


@app.post("/api/rag/process-report", response_model=ReportAnalysis)
async def process_report(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None)
):
    """
    Process uploaded medical report PDF
    1. Extract text from PDF
    2. Create FAISS vector store
    3. Extract medical information using Gemini
    4. Generate summary
    """
    try:
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        print(f"Processing file: {file.filename}")
        
        # Step 1: Extract text
        raw_text, _ = pdf_processor.extract_text(tmp_path)
        
        if not raw_text or len(raw_text.strip()) < 50:
            raise HTTPException(400, "No readable text in PDF")
        
        print(f"Extracted {len(raw_text)} characters")
        
        # Step 2: Create vector store
        text_chunks = pdf_processor.create_chunks(raw_text)
        report_id = f"RPT_{patient_id}_{file.filename.replace('.pdf', '')}"
        faiss_path = rag_engine.create_vector_store(text_chunks, report_id)
        
        print(f"Created FAISS index: {faiss_path}")
        
        # Step 3: Extract medical info
        extracted_info = medical_extractor.extract_info(raw_text)
        
        # Step 4: Generate summary
        summary = medical_extractor.generate_summary(raw_text)
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        return ReportAnalysis(
            report_id=report_id,
            patient_name=extracted_info.get('patient_name'),
            patient_age=extracted_info.get('patient_age'),
            patient_gender=extracted_info.get('patient_gender'),
            report_type=extracted_info.get('report_type'),
            report_date=extracted_info.get('report_date'),
            diagnosis=extracted_info.get('diagnosis'),
            summary=summary,
            key_findings=extracted_info.get('key_findings'),
            recommendations=extracted_info.get('recommendations'),
            test_results=extracted_info.get('test_results', []),
            faiss_path=faiss_path
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Processing failed: {str(e)}")


@app.post("/api/rag/chat", response_model=ChatResponse)
async def chat_with_report(request: ChatRequest):
    """
    Chat with a processed report using RAG
    """
    try:
        answer = rag_engine.query(
            question=request.question,
            faiss_path=f"faiss_indexes/{request.report_id}"
        )
        
        return ChatResponse(
            answer=answer,
            confidence=0.85  # You can calculate this based on similarity scores
        )
        
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(500, f"Chat failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")