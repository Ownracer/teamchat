#!/bin/bash
echo "Starting TeamChat Backend Server..."
echo ""
echo "Using virtual environment: ../.venv"
echo ""

cd "$(dirname "$0")"
../.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

