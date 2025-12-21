from PyPDF2 import PdfReader
import logging
from typing import Tuple, List

logger = logging.getLogger(__name__)

class PDFProcessor:
    """Handle PDF text extraction"""
    
    @staticmethod
    def extract_text(pdf_file) -> Tuple[str, str]:
        """
        Extract text from PDF file
        
        Args:
            pdf_file: File object from request
            
        Returns:
            Tuple of (extracted_text, filename)
        """
        try:
            pdf_reader = PdfReader(pdf_file)
            text = ""
            file_name = pdf_file.filename
            
            logger.info(f"Extracting text from {file_name} ({len(pdf_reader.pages)} pages)")
            
            for page_num, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text += f"\n--- Page {page_num + 1} ---\n{page_text}"
                    
            if not text.strip():
                raise ValueError("No readable text found in PDF")
                
            logger.info(f"Successfully extracted {len(text)} characters from {file_name}")
            return text, file_name
            
        except Exception as e:
            logger.error(f"Error extracting PDF text: {str(e)}")
            raise

class TextSplitter:
    """Split text into chunks for embedding"""
    
    @staticmethod
    def split_text(text: str, chunk_size: int = 10000, overlap: int = 1000) -> List[str]:
        """
        Split text into overlapping chunks
        
        Args:
            text: Raw text to split
            chunk_size: Size of each chunk
            overlap: Overlap between chunks
            
        Returns:
            List of text chunks
        """
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=overlap,
            separators=["\n\n", "\n", " ", ""]
        )
        
        chunks = splitter.split_text(text)
        logger.info(f"Split text into {len(chunks)} chunks")
        return chunks
