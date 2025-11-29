# Makefile for BirdSound Backend
# Provides convenient shortcuts for common development tasks

.PHONY: help setup install test test-cov clean run run-prod download-models docker-up docker-down lint format

# Default target
help:
	@echo "BirdSound Backend - Available Commands"
	@echo "======================================="
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make setup          - Initial setup (create .env, directories)"
	@echo "  make install        - Install Python dependencies"
	@echo "  make download-models - Download production ML models"
	@echo ""
	@echo "Development:"
	@echo "  make run            - Run development server (with stubs)"
	@echo "  make run-prod       - Run with production models"
	@echo "  make test           - Run tests"
	@echo "  make test-cov       - Run tests with coverage"
	@echo "  make lint           - Run linters (ruff, mypy)"
	@echo "  make format         - Format code (black, ruff)"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up      - Start all services"
	@echo "  make docker-down    - Stop all services"
	@echo "  make docker-logs    - View logs"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean          - Remove cache and temp files"

# Setup
setup:
	@echo "Setting up BirdSound Backend..."
	python scripts/setup.py

install:
	@echo "Installing dependencies..."
	pip install -r requirements.txt

download-models:
	@echo "Downloading ML models..."
	python scripts/download_models.py

# Development server
run:
	@echo "Starting development server (with stub models)..."
	USE_MODEL_STUBS=true uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

run-prod:
	@echo "Starting server with production models..."
	USE_MODEL_STUBS=false uvicorn app.main:app --host 0.0.0.0 --port 8000

# Testing
test:
	@echo "Running tests..."
	USE_MODEL_STUBS=true pytest tests/ -v

test-cov:
	@echo "Running tests with coverage..."
	USE_MODEL_STUBS=true pytest tests/ --cov=app --cov-report=html --cov-report=term

test-models:
	@echo "Testing runtime models..."
	USE_MODEL_STUBS=true python scripts/test_runtime_models.py

# Code quality
lint:
	@echo "Running linters..."
	ruff check app/ tests/
	mypy app/

format:
	@echo "Formatting code..."
	black app/ tests/ scripts/
	ruff check --fix app/ tests/

# Docker
docker-up:
	@echo "Starting Docker services..."
	docker-compose up -d

docker-down:
	@echo "Stopping Docker services..."
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-rebuild:
	@echo "Rebuilding Docker images..."
	docker-compose up -d --build

# Database
db-migrate:
	@echo "Running database migrations..."
	alembic upgrade head

db-revision:
	@echo "Creating new migration..."
	@read -p "Migration message: " msg; \
	alembic revision --autogenerate -m "$$msg"

# Cleanup
clean:
	@echo "Cleaning up..."
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .mypy_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name htmlcov -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name ".coverage" -delete
	@echo "Cleanup complete!"
