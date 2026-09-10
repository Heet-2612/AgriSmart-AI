#!/usr/bin/env bash
set -e

echo "=== Setting up AgriSmart AI Environment ==="

if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv .venv
fi

echo "Activating virtual environment..."
source .venv/bin/activate || source .venv/Scripts/activate

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Installing Frontend dependencies..."
cd frontend
npm install
cd ..

echo "=== Setup Completed Successfully ==="
