"""Medical Information Extraction using Gemini"""
import json
from langchain_google_genai import ChatGoogleGenerativeAI


class MedicalExtractor:
    def __init__(self):
        self.model = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash-exp",
            temperature=0.1
        )
    
    def extract_info(self, raw_text: str) -> dict:
        """Extract structured medical information"""
        prompt = f"""
        Analyze this medical report and extract information in valid JSON format.
        Use null for missing fields.
        
        Extract these fields:
        - patient_name (string)
        - patient_age (number)
        - patient_gender (Male/Female/Other)
        - patient_id (string)
        - report_date (YYYY-MM-DD format)
        - report_type (Blood Test/X-Ray/MRI/CT Scan/General Checkup/etc)
        - hospital_name (string)
        - doctor_name (string)
        - diagnosis (string - main findings)
        - key_findings (string - important observations)
        - recommendations (string - doctor's advice)
        - test_results (array of objects with: test_name, test_value, unit, normal_range, status)
        
        Medical Report:
        {raw_text[:12000]}
        
        Return ONLY valid JSON, no markdown, no explanation.
        """
        
        try:
            response = self.model.invoke(prompt)
            response_text = response.content
            
            # Clean JSON
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            return json.loads(response_text.strip())
        except Exception as e:
            print(f"Extraction error: {e}")
            return {}
    
    def generate_summary(self, raw_text: str) -> str:
        """Generate medical summary"""
        prompt = f"""
        Generate a professional medical summary (200-350 words) covering:
        1. Patient Overview
        2. Key Test Results
        3. Main Diagnosis/Findings
        4. Notable Abnormalities (if any)
        5. Recommendations
        
        Medical Report:
        {raw_text[:12000]}
        
        Summary:
        """
        
        try:
            response = self.model.invoke(prompt)
            return response.content
        except Exception as e:
            return f"Summary generation failed: {e}"