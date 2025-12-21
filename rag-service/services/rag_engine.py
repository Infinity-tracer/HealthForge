"""RAG Engine - FAISS + LangChain"""
import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains.question_answering import load_qa_chain
from langchain_core.prompts import PromptTemplate


class RAGEngine:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        
        self.prompt_template = """
        You are a medical AI assistant. Answer the question based on the provided medical report context.
        If the answer is not in the context, say "This information is not available in the report."
        
        Context:\n{context}\n
        Question:\n{question}\n
        
        Answer (be precise and medical):
        """
    
    def create_vector_store(self, text_chunks: list, report_id: str) -> str:
        """Create FAISS vector store"""
        vector_store = FAISS.from_texts(text_chunks, embedding=self.embeddings)
        
        # Save with report ID
        faiss_dir = "faiss_indexes"
        os.makedirs(faiss_dir, exist_ok=True)
        
        faiss_path = f"{faiss_dir}/{report_id}"
        os.makedirs(faiss_path, exist_ok=True)
        vector_store.save_local(faiss_path)
        
        return faiss_path
    
    def query(self, question: str, faiss_path: str) -> str:
        """Query using RAG"""
        try:
            # Load vector store
            if not os.path.exists(faiss_path):
                return "Error: Report index not found. Please process the report first."
            
            vector_store = FAISS.load_local(
                faiss_path, 
                self.embeddings, 
                allow_dangerous_deserialization=True
            )
            
            # Search similar documents
            docs = vector_store.similarity_search(question, k=3)
            
            if not docs:
                return "No relevant information found in the report."
            
            # Create Q&A chain
            model = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash-exp",
                temperature=0.3
            )
            
            prompt = PromptTemplate(
                template=self.prompt_template, 
                input_variables=["context", "question"]
            )
            
            chain = load_qa_chain(model, chain_type="stuff", prompt=prompt)
            
            # Get answer
            response = chain(
                {"input_documents": docs, "question": question},
                return_only_outputs=True
            )
            
            return response["output_text"]
            
        except Exception as e:
            return f"Error processing question: {str(e)}"