"""
Prometheus metrics for application monitoring.

Provides key performance indicators (KPIs) for:
- Request rates and latencies
- Prediction statistics
- Model performance
- System health
"""
import time
from typing import Callable, Dict
from functools import wraps
from dataclasses import dataclass, field
from collections import defaultdict
import threading


@dataclass
class MetricsCollector:
    """
    Thread-safe metrics collector for Prometheus-style metrics.
    
    Collects:
    - Counters: Cumulative values (e.g., total requests)
    - Gauges: Point-in-time values (e.g., active connections)
    - Histograms: Distribution of values (e.g., latencies)
    """
    
    _counters: Dict[str, float] = field(default_factory=lambda: defaultdict(float))
    _gauges: Dict[str, float] = field(default_factory=lambda: defaultdict(float))
    _histograms: Dict[str, list] = field(default_factory=lambda: defaultdict(list))
    _lock: threading.Lock = field(default_factory=threading.Lock)
    
    def inc_counter(self, name: str, value: float = 1.0, labels: Dict = None):
        """Increment a counter metric."""
        key = self._make_key(name, labels)
        with self._lock:
            self._counters[key] += value
    
    def set_gauge(self, name: str, value: float, labels: Dict = None):
        """Set a gauge metric."""
        key = self._make_key(name, labels)
        with self._lock:
            self._gauges[key] = value
    
    def observe_histogram(self, name: str, value: float, labels: Dict = None):
        """Record a histogram observation."""
        key = self._make_key(name, labels)
        with self._lock:
            self._histograms[key].append(value)
            # Keep only last 1000 observations to prevent memory issues
            if len(self._histograms[key]) > 1000:
                self._histograms[key] = self._histograms[key][-1000:]
    
    def _make_key(self, name: str, labels: Dict = None) -> str:
        """Create a unique key for a metric with labels."""
        if not labels:
            return name
        label_str = ",".join(f'{k}="{v}"' for k, v in sorted(labels.items()))
        return f"{name}{{{label_str}}}"
    
    def _calculate_histogram_stats(self, values: list) -> Dict:
        """Calculate histogram statistics."""
        if not values:
            return {"count": 0, "sum": 0, "avg": 0, "min": 0, "max": 0}
        
        sorted_vals = sorted(values)
        return {
            "count": len(values),
            "sum": sum(values),
            "avg": sum(values) / len(values),
            "min": sorted_vals[0],
            "max": sorted_vals[-1],
            "p50": sorted_vals[len(sorted_vals) // 2],
            "p95": sorted_vals[int(len(sorted_vals) * 0.95)] if len(sorted_vals) >= 20 else sorted_vals[-1],
            "p99": sorted_vals[int(len(sorted_vals) * 0.99)] if len(sorted_vals) >= 100 else sorted_vals[-1],
        }
    
    def get_metrics(self) -> Dict:
        """Get all metrics in a dictionary format."""
        with self._lock:
            result = {
                "counters": dict(self._counters),
                "gauges": dict(self._gauges),
                "histograms": {
                    k: self._calculate_histogram_stats(v) 
                    for k, v in self._histograms.items()
                }
            }
        return result
    
    def format_prometheus(self) -> str:
        """Format metrics in Prometheus text format."""
        lines = []
        
        with self._lock:
            # Add HELP and TYPE headers for better Prometheus compatibility
            if self._counters:
                lines.append("# HELP http_requests_total Total HTTP requests")
                lines.append("# TYPE http_requests_total counter")
            for name, value in self._counters.items():
                lines.append(f"{name} {value}")
            
            if self._gauges:
                lines.append("# HELP model_loaded Models currently loaded (1=loaded, 0=unloaded)")
                lines.append("# TYPE model_loaded gauge")
            for name, value in self._gauges.items():
                lines.append(f"{name} {value}")
            
            # Histograms (simplified - just count and sum)
            if self._histograms:
                lines.append("# HELP http_request_duration_seconds Request latency in seconds")
                lines.append("# TYPE http_request_duration_seconds histogram")
            for name, values in self._histograms.items():
                if values:
                    stats = self._calculate_histogram_stats(values)
                    base_name = name.split("{")[0]
                    labels = name[len(base_name):] if "{" in name else ""
                    
                    # Prometheus histogram format
                    lines.append(f"{base_name}_count{labels} {stats['count']}")
                    lines.append(f"{base_name}_sum{labels} {stats['sum']:.6f}")
                    lines.append(f"{base_name}_avg{labels} {stats['avg']:.6f}")
        
        # Always return at least a comment if no metrics
        if not lines:
            lines.append("# BirdSound API Metrics - No data collected yet")
        
        return "\n".join(lines)


# Global metrics collector instance
metrics = MetricsCollector()


def track_request_time(endpoint: str = "unknown"):
    """
    Decorator to track request execution time.
    
    Usage:
        @track_request_time("predict")
        async def predict_endpoint(...):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                result = await func(*args, **kwargs)
                metrics.inc_counter(
                    "http_requests_total",
                    labels={"endpoint": endpoint, "status": "success"}
                )
                return result
            except Exception as e:
                metrics.inc_counter(
                    "http_requests_total",
                    labels={"endpoint": endpoint, "status": "error"}
                )
                raise
            finally:
                duration = time.perf_counter() - start
                metrics.observe_histogram(
                    "http_request_duration_seconds",
                    duration,
                    labels={"endpoint": endpoint}
                )
        return wrapper
    return decorator


def track_prediction(model_name: str, species: str, confidence: float, duration_ms: int):
    """
    Record prediction metrics.
    
    Args:
        model_name: Name of the ML model used
        species: Predicted species
        confidence: Prediction confidence (0-1)
        duration_ms: Inference time in milliseconds
    """
    metrics.inc_counter("predictions_total", labels={"model": model_name})
    metrics.observe_histogram(
        "prediction_latency_seconds",
        duration_ms / 1000,
        labels={"model": model_name}
    )
    metrics.observe_histogram(
        "prediction_confidence",
        confidence,
        labels={"model": model_name}
    )


def track_model_loaded(model_name: str, loaded: bool = True):
    """Track which models are currently loaded."""
    metrics.set_gauge(
        "model_loaded",
        1.0 if loaded else 0.0,
        labels={"model": model_name}
    )


class MetricsMiddleware:
    """
    Starlette middleware for automatic request metrics tracking.
    
    Tracks:
    - http_requests_total: Counter by endpoint and status
    - http_request_duration_seconds: Histogram by endpoint
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        path = scope.get("path", "unknown")
        method = scope.get("method", "GET")
        
        # Skip metrics endpoint to avoid recursion
        if path in ("/metrics", "/metrics/json"):
            await self.app(scope, receive, send)
            return
        
        start_time = time.perf_counter()
        status_code = 500  # Default to error
        
        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 500)
            await send(message)
        
        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration = time.perf_counter() - start_time
            
            # Simplify path for metrics (remove IDs)
            simplified_path = self._simplify_path(path)
            
            # Track request count
            metrics.inc_counter(
                "http_requests_total",
                labels={
                    "method": method,
                    "endpoint": simplified_path,
                    "status": str(status_code)
                }
            )
            
            # Track request duration
            metrics.observe_histogram(
                "http_request_duration_seconds",
                duration,
                labels={"endpoint": simplified_path}
            )
    
    def _simplify_path(self, path: str) -> str:
        """Remove dynamic IDs from paths for better metric aggregation."""
        import re
        # Replace UUIDs and numeric IDs with placeholders
        path = re.sub(r'/[0-9a-f-]{36}', '/{id}', path)
        path = re.sub(r'/\d+', '/{id}', path)
        return path
