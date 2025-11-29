"""
Metrics API endpoint for Prometheus monitoring.
"""
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

from app.core.metrics import metrics

router = APIRouter()


@router.get("/metrics", response_class=PlainTextResponse)
async def get_metrics():
    """
    Prometheus metrics endpoint.
    
    Returns metrics in Prometheus text exposition format.
    Can be scraped by Prometheus server for monitoring.
    
    Metrics include:
    - http_requests_total: Total HTTP requests by endpoint and status
    - http_request_duration_seconds: Request latency histogram
    - predictions_total: Total predictions by model
    - prediction_latency_seconds: Model inference time histogram
    - prediction_confidence: Confidence score distribution
    - model_loaded: Currently loaded models (gauge)
    """
    return metrics.format_prometheus()


@router.get("/metrics/json")
async def get_metrics_json():
    """
    Metrics in JSON format for custom dashboards.
    
    Returns all metrics with calculated histogram statistics.
    """
    return metrics.get_metrics()
