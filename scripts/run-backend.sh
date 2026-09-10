#!/usr/bin/env bash
set -e

echo "Starting AgriSmart AI FastAPI Backend..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
