# AgriSmart AI System Architecture

## Overview

AgriSmart AI follows a clean **modular monolith** design pattern optimized for low operational complexity, high reproducibility, and predictable deployment.

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

## Architectural Decisions

### 1. In-Process PyTorch Inference vs Microservices
Rather than splitting inference into a separate microservice communicating over gRPC/HTTP with distributed queues (Kafka/RabbitMQ), model inference is executed in-process within the FastAPI service layer.
- **Rationale**: Eliminates network serialization overhead, simplifies container topologies, and reduces cold-start latency during competition evaluations.

### 2. Elimination of Premature Distributed Infrastructure
We intentionally avoid Kubernetes, Kafka, Redis clusters, and Terraform during the core scaffold:
- **Rationale**: Hackathon evaluations require rapid judge verification (10-minute reproduction window). Extra infrastructure layers increase deployment failure points without offering tangible benefits for single-node validation.

### 3. Separation of Concerns
- `app/`: Exposes HTTP endpoints, manages authentication/CORS, and validates payload boundaries.
- `model/`: Encapsulates ML-specific logic, data loading, augmentation transforms, and weights.
- `frontend/`: Single-page application for responsive leaf image uploads and diagnostic inspections.
- `database/`: Persistent storage for audit logs and historical diagnostics.
