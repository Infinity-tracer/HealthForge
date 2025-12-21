"""PDF Processing Service"""
from PyPDF2 import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import Tuple, List


class PDFProcessor:
    def extract_text(self, pdf_path: str) -> Tuple[str, List[str]]:
        """Extract text from PDF"""
        text = ""
        file_name = pdf_path.split("/")[-1].split("\\")[-1]
        
        try:
            pdf_reader = PdfReader(pdf_path)
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            
            return text, [file_name]
        except Exception as e:
            raise Exception(f"PDF extraction failed: {e}")
    
    def create_chunks(self, text: str, chunk_size: int = 10000, 
                     overlap: int = 1000) -> List[str]:
        """Split text into chunks"""
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=overlap
        )
        return splitter.split_text(text)