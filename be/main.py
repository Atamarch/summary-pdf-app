import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
import google.generativeai as genai
from dotenv import load_dotenv
import io
from langdetect import detect, DetectorFactory

DetectorFactory.seed = 0

load_dotenv()

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_text_from_pdf(pdf_file) -> str:
    """Extract text from PDF file"""
    try:
        reader = PdfReader(pdf_file)
        text = ""
        
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")

def detect_language(text: str) -> tuple:
    """
    Detect language from text
    Returns: (language_code, language_name)
    """
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
        
    except Exception as e:
        return "unknown", "Unknown"

def summarize_text(text: str, lang_code: str = "en") -> str:
    """Generate summary using Gemini AI with structured format"""
    
    prompt = f"""
    Summarize this document in the SAME LANGUAGE as the document. with this struct:
        
    Write a clear and concise summary in 1-2 paragraphs or adjust it to the information contained in the relevant document.
    Use <mark style="background-color: #2196F3; color: white;">blue highlight</mark> for important terms and key information.
    
    ---
    
    Document:
    {text[:15000]}
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")

@app.get("/")
async def root():
    return {
        "message": "PDF Summarizer API",
        "status": "running",
    }

@app.post("/api/summarize")
async def summarize_pdf(file: UploadFile = File(...)):
    """
    Endpoint to upload PDF and get structured summary with language detection
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    pdf_bytes = await file.read()
    
    if len(pdf_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")
    
    pdf_file = io.BytesIO(pdf_bytes)
    
    text = extract_text_from_pdf(pdf_file)
    
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")
    
    lang_code, lang_name = detect_language(text)
    
    summary = summarize_text(text, lang_code)
    
    return {
        "summary": summary,
        "file_name": file.filename,
        "text_length": len(text),
        "detected_language": {
            "code": lang_code,
            "name": lang_name
        },
        "metadata": {
            "model": "gemini-2.5-flash",
            "temperature": 0.3,
            "top_p": 0.8,
            "top_k": 40
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)