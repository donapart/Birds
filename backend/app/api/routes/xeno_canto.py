"""
Xeno-canto API routes for reference recordings.

Provides access to the world's largest bird sound database
for species validation and reference audio.
"""
import logging
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.xeno_canto import get_xeno_canto_service

logger = logging.getLogger(__name__)
router = APIRouter()


class RecordingResponse(BaseModel):
    """A Xeno-canto recording."""
    id: str
    species: str
    scientific_name: str
    common_name: str
    country: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    quality: str
    length: str
    file_url: str
    sonogram_url: Optional[str] = None
    recordist: str
    type: str


class SearchResponse(BaseModel):
    """Search results from Xeno-canto."""
    recordings: List[RecordingResponse]
    total: int
    num_species: int
    page: int
    pages: int


@router.get("/xeno-canto/search", response_model=SearchResponse)
async def search_recordings(
    query: Optional[str] = Query(None, description="Free-text search"),
    species: Optional[str] = Query(None, description="Scientific name"),
    country: Optional[str] = Query(None, description="Country code or name"),
    quality: Optional[str] = Query("A B", description="Quality filter (A=best)"),
    type: Optional[str] = Query(None, description="Vocalization type (song, call)"),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50)
):
    """
    Search Xeno-canto recordings.
    
    Returns bird sound recordings from the world's largest database.
    Use quality filter to get the best recordings (A=excellent, E=poor).
    """
    service = get_xeno_canto_service()
    
    result = await service.search(
        query=query,
        species=species,
        country=country,
        quality=quality,
        type_=type,
        page=page,
        per_page=per_page
    )
    
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    
    return SearchResponse(
        recordings=[
            RecordingResponse(
                id=r.id,
                species=r.species,
                scientific_name=r.scientific_name,
                common_name=r.common_name,
                country=r.country,
                location=r.location,
                latitude=r.latitude,
                longitude=r.longitude,
                quality=r.quality,
                length=r.length,
                file_url=r.file_url,
                sonogram_url=r.sonogram_url,
                recordist=r.recordist,
                type=r.type
            )
            for r in result.get("recordings", [])
        ],
        total=result.get("total", 0),
        num_species=result.get("num_species", 0),
        page=result.get("page", 1),
        pages=result.get("pages", 1)
    )


@router.get("/xeno-canto/reference/{scientific_name}", response_model=RecordingResponse)
async def get_reference_recording(
    scientific_name: str,
    type: Optional[str] = Query(None, description="Vocalization type")
):
    """
    Get a high-quality reference recording for a species.
    
    Useful for validating detections by comparing against known good recordings.
    """
    service = get_xeno_canto_service()
    
    recording = await service.get_reference_for_validation(
        scientific_name=scientific_name.replace("_", " "),
        detected_type=type
    )
    
    if not recording:
        raise HTTPException(
            status_code=404,
            detail=f"No reference recording found for {scientific_name}"
        )
    
    return RecordingResponse(
        id=recording.id,
        species=recording.species,
        scientific_name=recording.scientific_name,
        common_name=recording.common_name,
        country=recording.country,
        location=recording.location,
        latitude=recording.latitude,
        longitude=recording.longitude,
        quality=recording.quality,
        length=recording.length,
        file_url=recording.file_url,
        sonogram_url=recording.sonogram_url,
        recordist=recording.recordist,
        type=recording.type
    )


@router.get("/xeno-canto/species/{scientific_name}", response_model=List[RecordingResponse])
async def get_species_recordings(
    scientific_name: str,
    quality: str = Query("A B", description="Quality filter"),
    type: Optional[str] = Query(None, description="Vocalization type"),
    limit: int = Query(5, ge=1, le=20)
):
    """
    Get recordings for a specific species.
    
    Returns multiple recordings sorted by quality for species exploration.
    """
    service = get_xeno_canto_service()
    
    recordings = await service.get_species_recordings(
        scientific_name=scientific_name.replace("_", " "),
        quality=quality,
        type_=type,
        limit=limit
    )
    
    return [
        RecordingResponse(
            id=r.id,
            species=r.species,
            scientific_name=r.scientific_name,
            common_name=r.common_name,
            country=r.country,
            location=r.location,
            latitude=r.latitude,
            longitude=r.longitude,
            quality=r.quality,
            length=r.length,
            file_url=r.file_url,
            sonogram_url=r.sonogram_url,
            recordist=r.recordist,
            type=r.type
        )
        for r in recordings
    ]
