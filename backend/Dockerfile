# BirdSound API Dockerfile
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libsndfile1 \
    libsndfile1-dev \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Install Python dependencies (pinned lockfile for reproducible builds)
COPY requirements.lock .
RUN pip install --no-cache-dir -r requirements.lock

# Non-root runtime user
RUN useradd --create-home --shell /usr/sbin/nologin app

# Copy application code
COPY --chown=app:app . .

# Create directories for models and audio storage
RUN mkdir -p models/birdnet audio_storage && chown -R app:app /app

USER app
ENV HOME=/home/app

# Expose port
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
