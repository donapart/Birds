"""
Health check endpoints.
"""
from fastapi import APIRouter
from app.services.model_registry import model_registry

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.

    Returns:
        - status: "healthy" if all systems operational
        - models_loaded: number of ML models ready for inference
    """
    return {
        "status": "healthy",
        "models_loaded": len(model_registry.models),
        "models": list(model_registry.models.keys())
    }


@router.get("/health/detailed")
async def detailed_health():
    """
    Detailed health check with component status.
    """
    model_status = {}
    for name, model in model_registry.models.items():
        model_status[name] = {
            "loaded": model.is_loaded,
            "version": model.model_version
        }

    return {
        "status": "healthy",
        "components": {
            "api": "operational",
            "models": model_status,
        }
    }
