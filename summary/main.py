from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
import os
import io
from pypdf import PdfReader
import google.generativeai as genai
from dotenv import load_dotenv
from langdetect import detect, DetectorFactory
from typing import Optional

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
    allow_origins=[backend_url] if backend_url else ["*"],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Response DTO
class SummarizeResponse(BaseModel):
    summary_text: str
    processing_time_ms: int
    success: bool
    error: str = ""

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
            return "en", "English"
        
        lang_code = detect(sample)
        
        lang_names = {
            'id': 'Indonesian',
            'en': 'English',
            'ja': 'Japanese'
        }
        
        lang_name = lang_names.get(lang_code, "English")
        lang_code = lang_code if lang_code in ['id', 'en', 'ja'] else 'en'
        
        return lang_code, lang_name
        
    except Exception:
        return "en", "English"

def get_target_language(lang_config: str, detected_lang: str) -> tuple:
    """
    Determine target language based on config
    Priority: user config > auto detect
    """
    if lang_config == "auto":
        return detected_lang, "detected language"
    elif lang_config == "id":
        return "id", "Indonesian"
    elif lang_config == "en":
        return "en", "English"
    elif lang_config == "ja":
        return "ja", "Japanese"
    else:
        return detected_lang, "detected language"

def summarize_text(text: str, target_lang: str, output_type: str) -> str:
    """Generate summary using Gemini AI based on config"""
    
    # Language instruction
    lang_instruction = {
        "id": "Bahasa Indonesia",
        "en": "English",
        "ja": "Japanese"
    }.get(target_lang, "English")
    
    # Output format instruction
    if output_type == "paragraph":
        format_instruction = """
        FORMAT: Write in PARAGRAPH form with proper structure.
        - Start with an overview paragraph (1 sentences)
        - Follow with 1-2 body paragraphs explaining main ideas
        - End with a conclusion paragraph (1 sentences)
        - Use natural flowing sentences, NOT bullet points
        - Highlight EXACTLY 5 MOST IMPORTANT terms using: <mark style="background-color: #2196F3; color: white;">term</mark>
        """
    else:  # bullet or pointer
        format_instruction = """
        FORMAT: Write in BULLET POINT form with clear structure.
        - Start with EXACTLY ONE bullet point overview
        - Follow with 3 bullet points for main ideas
        - End with EXACTLY ONE concluding bullet point
        - Each bullet must be concise (one sentence)
        - Use "-" for bullets, NO sub-bullets
        - Highlight EXACTLY 5 MOST IMPORTANT terms using: <mark style="background-color: #2196F3; color: white;">term</mark>
        """
    
    prompt = f"""
    Summarize the following document in {lang_instruction}.
    
    {format_instruction}
    
    CRITICAL RULES:
    1. Write ENTIRELY in {lang_instruction}
    2. Keep it concise and clear
    3. EXACTLY 5 highlighted terms total (no more, no less)
    4. Do NOT repeat highlights unnecessarily
    5. Avoid filler words
    
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

@app.post("/summarize", response_model=SummarizeResponse)
async def summarize_pdf(
    file: UploadFile = File(...),
    pdf_id: Optional[str] = Form(None),
    original_filename: Optional[str] = Form(None),
    file_size: Optional[str] = Form(None),
    language: str = Form("auto"),
    output_type: str = Form("paragraph")
):
    """
    Endpoint untuk Golang Backend
    Terima file + config, return summary
    """
    start_time = time.time()
    
    try:
        print(f"Processing PDF:")
        print(f"  - PDF ID: {pdf_id}")
        print(f"  - Filename: {original_filename}")
        print(f"  - Size: {file_size} bytes")
        print(f"  - Language Config: {language}")
        print(f"  - Output Type: {output_type}")
        
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
        detected_lang, detected_name = detect_language(text)
        print(f"  - Detected Language: {detected_name} ({detected_lang})")
        
        # Determine target language based on config
        target_lang, lang_label = get_target_language(language, detected_lang)
        print(f"  - Target Language: {target_lang}")
        print(f"  - Output Format: {output_type}")
        
        # Generate summary with config
        summary = summarize_text(text, target_lang, output_type)
        
        # Calculate processing time
        processing_time = int((time.time() - start_time) * 1000)
        
        print(f"  - Processing completed in {processing_time}ms")
        
        return SummarizeResponse(
            summary_text=summary,
            processing_time_ms=processing_time,
            success=True
        )
        
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        print(f"  - Error: {str(e)}")
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