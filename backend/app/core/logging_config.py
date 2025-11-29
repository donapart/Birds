"""
Structured logging configuration for production environments.

Provides JSON-formatted logs suitable for log aggregation systems
like ELK Stack, Datadog, Azure Monitor, etc.
"""
import logging
import sys
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.core.config import get_settings


class JSONFormatter(logging.Formatter):
    """
    Custom JSON formatter for structured logging.
    
    Outputs logs in a machine-readable JSON format with consistent fields.
    """
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_data: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields from the record
        if hasattr(record, "extra_data"):
            log_data["extra"] = record.extra_data
        
        # Add request context if available
        for field in ["request_id", "user_id", "endpoint", "method", "status_code",
                      "duration_ms", "model_name", "species", "confidence"]:
            if hasattr(record, field):
                log_data[field] = getattr(record, field)
        
        return json.dumps(log_data, default=str)


class StructuredLogger(logging.LoggerAdapter):
    """
    Logger adapter that adds structured context to all log messages.
    """
    
    def process(self, msg: str, kwargs: Dict) -> tuple:
        """Add extra context to log messages."""
        extra = kwargs.get("extra", {})
        extra.update(self.extra)
        kwargs["extra"] = extra
        return msg, kwargs


def setup_logging(
    level: str = "INFO",
    json_format: bool = True,
    include_request_id: bool = True
) -> None:
    """
    Configure application logging.
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_format: If True, output logs as JSON; otherwise use text format
        include_request_id: If True, add request ID tracking
    """
    settings = get_settings()
    
    # Determine log level
    log_level = getattr(logging, level.upper(), logging.INFO)
    
    # Create root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    
    # Choose formatter based on settings
    if json_format and not settings.DEBUG:
        formatter = JSONFormatter()
    else:
        # Human-readable format for development
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
    
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Suppress noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("transformers").setLevel(logging.WARNING)
    
    # Log startup info
    logger = logging.getLogger(__name__)
    logger.info(
        "Logging configured",
        extra={
            "level": level,
            "json_format": json_format,
            "debug_mode": settings.DEBUG
        }
    )


def get_logger(name: str, **context) -> StructuredLogger:
    """
    Get a structured logger with optional context.
    
    Args:
        name: Logger name (usually __name__)
        **context: Additional context to include in all log messages
        
    Returns:
        StructuredLogger instance
        
    Example:
        logger = get_logger(__name__, service="prediction")
        logger.info("Processing audio", extra={"duration": 3.5})
    """
    base_logger = logging.getLogger(name)
    return StructuredLogger(base_logger, context)
