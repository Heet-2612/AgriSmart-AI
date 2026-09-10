# AgriSmart AI

AgriSmart AI is an intelligent crop disease diagnosis platform designed for **Smart India Hackathon 2026**. The system provides automated computer vision inference to detect plant foliar diseases from leaf imagery and support resilient agricultural practices.

---

## Problem

Crop foliar diseases cause major agricultural losses worldwide. Manual visual diagnosis is often unavailable or slow in rural regions. AgriSmart AI aims to provide rapid, field-resilient diagnostic predictions under varied real-world conditions (illumination changes, complex backgrounds, and varying disease severity).

---

## Planned Architecture

```text
React Frontend (Vite + TypeScript)
        │
        ▼  (REST / multipart/form-data)
FastAPI Backend (Python 3.12)
        │
        ├─────────────────────────────┐
        ▼                             ▼
PyTorch Inference (In-process)   PostgreSQL 17.x
(model/inference/predict.py)     (Prediction Logs & Metadata)
```

* **Frontend:** React SPA with leaf image preview and diagnostic output.
* **Backend:** FastAPI modular monolith handling request validation, error reporting, and model routing.
* **PyTorch Inference:** Low-latency in-process inference interface.
* **PostgreSQL 17.x:** Relational store for diagnostic logging and history tracking.

---

## Repository Structure

```text
AgriSmart-AI/
├── README.md             # Project overview, instructions, and metrics
├── LICENSE               # MIT License
├── .gitignore            # Git exclusions
├── .env.example          # Environment variable template
├── requirements.txt      # Pinned Python dependencies
├── docker-compose.yml    # Docker services for PostgreSQL and FastAPI
├── app/                  # FastAPI web application and routing
├── model/                # Model training, inference, and checkpoints
├── report/               # Model evaluation report and metrics
├── frontend/             # React + TypeScript + Vite web client
├── database/             # Database migrations and seed scripts
├── docs/                 # Architecture, API contract, and guides
├── tests/                # Automated backend, model, and e2e test suites
└── scripts/              # Setup and execution shell scripts
```

---

## Technology Stack

* **Runtime:** Python 3.12.x, Node.js 22.x
* **Frontend:** React 19.x, TypeScript 5.x, Vite 7.x, Tailwind CSS 4.x
* **Backend:** FastAPI 0.116.x, Pydantic 2.11.x, SQLAlchemy 2.0.x, Alembic 1.16.x
* **AI / ML:** PyTorch 2.7.x, torchvision 0.22.x, timm 1.0.x, Albumentations 2.0.x, scikit-learn 1.7.x, MLflow 3.15.x
* **Database:** PostgreSQL 17.x
* **Testing:** pytest 8.x, Vitest 3.x, React Testing Library 16.x, Playwright 1.53.x

*Note: Base PyTorch wheels are specified. CUDA version is NOT assumed and will be configured based on the actual training GPU environment.*

---

## Setup Placeholder

### Local Setup
1. Clone repository: `git clone <repo-url>`
2. Setup backend: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
3. Start database: `docker-compose up -d postgres`
4. Run backend: `uvicorn app.main:app --reload --port 8000`
5. Setup frontend: `cd frontend && npm install && npm run dev`

### Docker Setup
```bash
docker-compose up --build
```

---

## Dataset Placeholder

* **Dataset source:** TBD — official organizer source to be confirmed
* **Dataset licence:** TBD
* **Dataset split:** TBD
* **Disease classes:** TBD

*No dataset is downloaded or fabricated in this initial scaffold.*

---

## Planned Model Experiments

* **E1:** ResNet-50 baseline
* **E2:** EfficientNet-B2
* **E3:** ConvNeXt-Tiny
* **E4:** Best candidate + stronger domain-shift-aware augmentation
* **E5:** Targeted fine-tuning of strongest candidate

---

## Metrics Placeholder

> Model training pending. No experimental metrics are available yet.

| Model | Macro-F1 | Accuracy |
| :--- | :---: | :---: |
| ResNet-50 | TBD | TBD |
| EfficientNet-B2 | TBD | TBD |
| ConvNeXt-Tiny | TBD | TBD |

---

## Known Limitations

* **Domain gap:** Field imagery with complex background clutter and shadows differs from controlled lab photos.
* **Early symptoms:** Phenotypically similar lesions across different pathogens in early growth phases.
* **Sensor quality:** Noise and motion blur on budget mobile camera sensors.

---

## Demo

* **Demo video:** TBD
* **Deployed application:** TBD
