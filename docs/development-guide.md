# AgriSmart AI Development Guide

## Prerequisites
- Python 3.12.x
- Node.js 22.x
- PostgreSQL 17.x (or Docker / Docker Compose)

---

## 1. Local Environment Setup

### Backend
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

---

## 2. Running Services

### Start Database via Docker
```bash
docker-compose up -d postgres
```

### Run FastAPI Backend
```bash
uvicorn app.main:app --reload --port 8000
```
Backend API will be accessible at `http://localhost:8000`.
Interactive Swagger UI at `http://localhost:8000/docs`.

### Run Frontend Development Server
```bash
cd frontend
npm run dev
```
Frontend will be accessible at `http://localhost:5173`.

---

## 3. Running Tests

### Backend Unit Tests
```bash
pytest tests/backend tests/model
```

### Frontend Tests
```bash
cd frontend
npm run test
```

---

## 4. Git Workflow Guidelines
- Branch naming: `feature/<feature-name>`, `fix/<bug-name>`
- Commit messages: Follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Always verify tests and linter before staging commits.
