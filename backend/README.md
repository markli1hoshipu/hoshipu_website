# Hoshipu Backend API

FastAPI backend for Hoshipu's personal website tools.

## Features

- PDF Processing: Extract invoice information and rename PDFs

## Setup

1. Create virtual environment:
```bash
python -m venv venv
```

2. Activate virtual environment:
```bash
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the server:
```bash
python main.py
```

Server will be running at http://localhost:8000

## API Endpoints

- `GET /` - API info
- `GET /health` - Health check
- `POST /api/pdf/process` - Process PDFs and return metadata
- `POST /api/pdf/process-and-download` - Process PDFs and download as ZIP
- `GET /api/pdf/templates` - Get available templates

## Development

The API auto-reloads on code changes when running with `python main.py`.
