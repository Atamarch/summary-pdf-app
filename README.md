# PDF Summarizer

A simple PDF summarizer application using FastAPI (Backend) and Next.js (Frontend) powered by Google Gemini AI.

## Project Structure
pdf-summarizer/
├── backend/        # FastAPI + Gemini AI
└── frontend/       # Next.js app

## Clone
```bash
git clone https://github.com/Atamarch/summary-pdf-next.git
```

## Backend Setup (FastAPI + Gemini)

### Requirements
- Python 3.14+ (recommended)
- Gemini API Key

### Installation
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Variables
```bash
Create a .env file inside the backend folder:
GEMINI_API_KEY=your_gemini_api_key_here
```

### Run Backend Server
```bash
uvicorn main:app --reload

Backend will run at:
http://localhost:8000
```

### Backend Notes
- Only supports text-based PDFs (not scanned images)
- Uses gemini-2.5-flash

Includes:
- Language detection
- Structured summary


## Frontend Setup (Next.js)

### Requirements
- Node.js 20+
- npm / pnpm / yarn

### Installation
```bash
cd frontend
npm install
```

### Run Frontend
```bash
npm run dev

Frontend will run at:
http://localhost:3000
```

### Frontend Notes
Built with Next.js

Upload PDF and display:
- Summary result
- Communicates with backend via REST API

### API Endpoint
Backend endpoint used by frontend:

POST /api/summarize