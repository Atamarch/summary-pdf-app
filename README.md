# PDF Summarizer

A simple PDF summarizer application using FastAPI (Backend) and Next.js (Frontend) powered by Google Gemini AI.

## Project Structure
```bash
summary-pdf-app/
├── be/        # GoFiber
└── fe/        # Next.js app
└── summary/   # FastAPI + Gemini AI
```

## Clone
```bash
git clone https://github.com/Atamarch/summary-pdf-app.git
```

## Backend Setup (GoFiber)

### Requirements
- Go 1.22+

### Instalation
```bash
cd be
go mod tidy
```

### Environment Variables
```bash
cp .env.example .env
add summary url
```

### Run Backend Server
```bash
go run ./src
```

### Backend Notes
- Handles PDF upload & storage
- Communicates with FastAPI summarizer service


## Summary Setup (FastAPI + Gemini)

### Requirements
- Python 3.14+
- Gemini API Key

### Installation
```bash
cd summary
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Variables
```bash
Create a .env file inside the backend folder:
GEMINI_API_KEY=your_gemini_api_key_here
```

### Run Summary Server
```bash
./venv/scripts/activate
uvicorn main:app --reload

Backend will run at:
http://localhost:8000
```

### Summary Notes
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
- Post(/v1/pdfs)
- Get(/v1/pdfs)
- Get(/v1/pdfs:id)
- Get(/v1/pdfs:id/view)
- Delete(/v1/pdfs:id)
- Post(/v1/pdfs:id/summarize)
