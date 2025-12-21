from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain.chains.question_answering import load_qa_chain
import json
import logging
import os

logger = logging.getLogger(__name__)

class RAGProcessor:
    """Handle RAG pipeline operations"""
    
    def __init__(self):
        self.embeddings = None
        self.vector_store = None
        self.chain = None
        self._initialize_embeddings()
    
    def _initialize_embeddings(self):
        """Initialize HuggingFace embeddings"""
        try:
            self.embeddings = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )
            logger.info("HuggingFace embeddings initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing embeddings: {str(e)}")
            raise
    
    def create_vector_store(self, text_chunks: list, faiss_path: str = None) -> str:
        """
        Create FAISS vector store from text chunks
        
        Args:
            text_chunks: List of text chunks
            faiss_path: Path to save FAISS index
            
        Returns:
            Path to saved FAISS index
        """
        try:
            logger.info(f"Creating vector store with {len(text_chunks)} chunks")
            
            if not faiss_path:
                faiss_path = "faiss_index"
            
            vector_store = FAISS.from_texts(text_chunks, embedding=self.embeddings)
            vector_store.save_local(faiss_path)
            
            logger.info(f"Vector store saved to {faiss_path}")
            return faiss_path
            
        except Exception as e:
            logger.error(f"Error creating vector store: {str(e)}")
            raise
    
    def load_vector_store(self, faiss_path: str):
        """Load existing FAISS vector store"""
        try:
            self.vector_store = FAISS.load_local(
                faiss_path,
                self.embeddings,
                allow_dangerous_deserialization=True
            )
            logger.info(f"Vector store loaded from {faiss_path}")
            return self.vector_store
        except Exception as e:
            logger.error(f"Error loading vector store: {str(e)}")
            raise
    
    def extract_medical_info(self, raw_text: str) -> dict:
        """
        Extract structured medical information using Gemini
        
        Args:
            raw_text: Raw text from PDF
            
        Returns:
            Dictionary with extracted medical information
        """
        extraction_prompt = f"""
        Analyze the following medical report and extract information in JSON format.
        Return ONLY valid JSON, no additional text.
        
        Extract these fields (use null if not found):
        - patient_name: Full name
        - patient_age: Age as number
        - patient_gender: Male/Female/Other
        - patient_id: Patient ID or registration
        - report_date: Date in YYYY-MM-DD format
        - report_type: Blood Test/X-Ray/MRI/CT/Pathology/etc
        - hospital_name: Hospital/clinic name
        - doctor_name: Doctor's name
        - diagnosis: Main diagnosis/findings
        - key_findings: Important observations
        - recommendations: Doctor's recommendations
        - test_results: Array of {{test_name, test_value, unit, normal_range, status}}
        
        Medical Report:
        {raw_text[:15000]}
        """
        
        try:
            model = ChatGoogleGenerativeAI(
                model="models/gemini-2.5-flash",
                temperature=0.1
            )
            
            response = model.invoke(extraction_prompt)
            response_text = response.content
            
            # Parse JSON from response
            if "```json" in response_text:
                response_text = response_text.split("```json").split("```")
            elif "```" in response_text:
                response_text = response_text.split("```").split("```")
            
            extracted_info = json.loads(response_text.strip())
            logger.info(f"Successfully extracted medical information")
            return extracted_info
            
        except Exception as e:
            logger.error(f"Error extracting medical info: {str(e)}")
            return {}
    
    def generate_summary(self, raw_text: str) -> str:
        """
        Generate AI summary of medical report
        
        Args:
            raw_text: Raw text from PDF
            
        Returns:
            Generated summary
        """
        summary_prompt = f"""
        Generate a comprehensive medical summary from this report:
        
        Include:
        1. Patient Overview (demographics, reason)
        2. Key Test Results and Values
        3. Main Diagnosis/Findings
        4. Notable Abnormalities
        5. Recommendations and Follow-up
        
        Keep it concise (200-400 words).
        
        Report:
        {raw_text[:15000]}
        """
        
        try:
            model = ChatGoogleGenerativeAI(
                model="models/gemini-2.5-flash",
                temperature=0.3
            )
            
            response = model.invoke(summary_prompt)
            summary = response.content
            
            logger.info("Summary generated successfully")
            return summary
            
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            return "Summary generation failed"
    
    def get_conversational_chain(self):
        """Create conversational chain for Q&A"""
        prompt_template = """
        Answer the question in detail from the provided context.
        If answer not in context, say "Answer not available in the context".
        Don't provide wrong information.
        
        Context:
        {context}
        
        Question:
        {question}
        
        Answer:
        """
        
        model = ChatGoogleGenerativeAI(
            model="models/gemini-2.5-flash",
            temperature=0.3
        )
        
        prompt = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )
        
        chain = load_qa_chain(model, chain_type="stuff", prompt=prompt)
        return chain
    
    def answer_question(self, question: str, faiss_path: str) -> str:
        """
        Answer question using RAG pipeline
        
        Args:
            question: User's question
            faiss_path: Path to FAISS index
            
        Returns:
            AI response
        """
        try:
            # Load vector store
            vector_store = self.load_vector_store(faiss_path)
            
            # Search for relevant documents
            docs = vector_store.similarity_search(question, k=5)
            
            # Generate answer
            chain = self.get_conversational_chain()
            response = chain(
                {"input_documents": docs, "question": question},
                return_only_outputs=True
            )
            
            logger.info(f"Question answered successfully")
            return response["output_text"]
            
        except Exception as e:
            logger.error(f"Error answering question: {str(e)}")
            raise
