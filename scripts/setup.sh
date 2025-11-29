#!/bin/bash
# BirdSound Setup Script
# Downloads models and sets up the environment

set -e

echo "========================================"
echo "BirdSound Setup"
echo "========================================"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "Project directory: $PROJECT_DIR"

# Create directories
echo ""
echo "Creating directories..."
mkdir -p "$PROJECT_DIR/models/birdnet"
mkdir -p "$PROJECT_DIR/audio_storage"
mkdir -p "$PROJECT_DIR/logs"

# Download BirdNET model
echo ""
echo "========================================"
echo "Downloading BirdNET ONNX Model (~150 MB)"
echo "========================================"

BIRDNET_MODEL="$PROJECT_DIR/models/birdnet/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx"
BIRDNET_LABELS="$PROJECT_DIR/models/birdnet/BirdNET_GLOBAL_6K_V2.4_Labels.txt"

if [ -f "$BIRDNET_MODEL" ]; then
    echo "BirdNET model already exists, skipping..."
else
    echo "Downloading BirdNET model..."
    curl -L -o "$BIRDNET_MODEL" \
        "https://huggingface.co/kahst/BirdNET-onnx/resolve/main/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx"
    echo "Model downloaded!"
fi

if [ -f "$BIRDNET_LABELS" ]; then
    echo "BirdNET labels already exist, skipping..."
else
    echo "Downloading BirdNET labels..."
    curl -L -o "$BIRDNET_LABELS" \
        "https://huggingface.co/kahst/BirdNET-onnx/resolve/main/BirdNET_GLOBAL_6K_V2.4_Labels.txt"
    echo "Labels downloaded!"
fi

# Copy environment file
echo ""
echo "========================================"
echo "Setting up environment"
echo "========================================"

if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    echo "Creating .env file from template..."
    cp "$PROJECT_DIR/backend/.env.example" "$PROJECT_DIR/backend/.env"
    echo "Created .env file. Please review and update if needed."
else
    echo ".env file already exists, skipping..."
fi

# Check if Docker is available
echo ""
echo "========================================"
echo "Checking Docker"
echo "========================================"

if command -v docker &> /dev/null; then
    echo "Docker is installed."
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null 2>&1; then
        echo "Docker Compose is available."
        echo ""
        echo "To start the application with Docker:"
        echo "  cd $PROJECT_DIR"
        echo "  docker-compose up -d"
    fi
else
    echo "Docker not found. For manual setup:"
    echo "  1. Install PostgreSQL with PostGIS"
    echo "  2. Create database 'birdsound'"
    echo "  3. Update DATABASE_URL in backend/.env"
    echo "  4. Run: cd backend && pip install -r requirements.txt"
    echo "  5. Run: cd backend && uvicorn app.main:app --reload"
fi

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Start with Docker:    docker-compose up -d"
echo "  2. Access frontend:      http://localhost:8000"
echo "  3. API documentation:    http://localhost:8000/docs"
echo ""
echo "For HuggingFace model (auto-downloads on first run):"
echo "  The dima806/bird_sounds_classification model will be"
echo "  downloaded automatically when the API starts."
echo ""
