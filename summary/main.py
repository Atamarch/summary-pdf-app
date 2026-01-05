import os
import time
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
import google.generativeai as genai
from dotenv import load_dotenv
from langdetect import detect, DetectorFactory
import io

DetectorFactory.seed = 0

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

generation_config = {
    "temperature": 0.3,
    "top_p": 0.8,
    "top_k": 40,
}

model = genai.GenerativeModel(
    "gemini-2.5-flash",
    generation_config=generation_config
)

app = FastAPI(title="PDF Summarizer API")

# CORS 
backend_url = os.getenv("BACKEND_URL")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[backend_url] if backend_url else [],
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# Response DTO
class SummarizeResponse(BaseModel):
    summary_text: str
    processing_time_ms: int
    success: bool
    error: str = None

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes"""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = ""
        
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        
        return text
    except Exception as e:
        raise Exception(f"Error reading PDF: {str(e)}")

def detect_language(text: str) -> tuple:
    """Detect language from text"""
    try:
        sample = text[:1000].strip()
        
        if not sample:
            return "unknown", "Unknown"
        
        lang_code = detect(sample)
        
        lang_names = {
            'id': 'Indonesian',
            'en': 'English',
            'ms': 'Malay',
            'jv': 'Javanese',
            'su': 'Sundanese',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'nl': 'Dutch',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh-cn': 'Chinese (Simplified)',
            'zh-tw': 'Chinese (Traditional)',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'th': 'Thai',
            'vi': 'Vietnamese',
        }
        
        lang_name = lang_names.get(lang_code, lang_code.upper())
        return lang_code, lang_name
        
    except Exception:
        return "unknown", "Unknown"

def summarize_text(text: str, lang_code: str = "en") -> str:
    """Generate summary using Gemini AI"""

    prompt = f"""
    Summarize the following document in the SAME LANGUAGE as the original document using the STRICT structure below.

    CRITICAL RULES (MUST FOLLOW):
    1. The summary MUST use bullet points ("-") only. Do NOT write long paragraphs.
    2. Start with EXACTLY ONE bullet point that provides a one-sentence overview of the document.
    3. Follow with 5–7 bullet points explaining the main ideas.
    4. End with EXACTLY ONE concluding bullet point.
    5. Highlight EXACTLY 5 MOST IMPORTANT terms or concepts in the entire summary.
    6. Use the following HTML tag for highlights ONLY:
    <mark style="background-color: #2196F3; color: white;">important term</mark>
    7. If more than 5 highlighted terms are used, the summary is INVALID.
    8. Do NOT repeat highlighted terms unless necessary.
    9. Avoid unnecessary wording and filler sentences.

    FORMAT RULES:
    - Each bullet point must be a single concise sentence.
    - Do NOT use sub-bullets or numbered lists.
    - Do NOT include headings or titles.

    ---
    Document:
    {text[:15000]}
    """
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        raise Exception(f"Error generating summary: {str(e)}")

@app.get("/")
async def root():
    return {
        "message": "PDF Summarizer API",
        "status": "running",
    }

@app.post("/summarize")
async def summarize_pdf(file: UploadFile = File(...)):
    """
    Endpoint untuk Golang Backend
    Terima file upload, return summary
    """
    start_time = time.time()
    
    try:
        # Read file content
        pdf_bytes = await file.read()
        
        if not pdf_bytes:
            return SummarizeResponse(
                summary_text="",
                processing_time_ms=0,
                success=False,
                error="Empty file"
            )
        
        # Extract text
        text = extract_text_from_pdf_bytes(pdf_bytes)
        
        if not text.strip():
            return SummarizeResponse(
                summary_text="",
                processing_time_ms=0,
                success=False,
                error="Could not extract text from PDF"
            )
        
        # Detect language
        lang_code, lang_name = detect_language(text)
        
        # Generate summary
        summary = summarize_text(text, lang_code)
        
        # Calculate processing time
        processing_time = int((time.time() - start_time) * 1000)
        
        return SummarizeResponse(
            summary_text=summary,
            processing_time_ms=processing_time,
            success=True
        )
        
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        return SummarizeResponse(
            summary_text="",
            processing_time_ms=processing_time,
            success=False,
            error=str(e)
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT"))
    uvicorn.run(app, host="0.0.0.0", port=port)