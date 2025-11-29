"""
Species API endpoints.

Provides access to the species database for bird information.
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Species
from app.data.species_europe import EUROPEAN_SPECIES, search_species, get_species_by_code

logger = logging.getLogger(__name__)
router = APIRouter()


class SpeciesResponse(BaseModel):
    """Species information response."""
    species_code: str
    scientific_name: str
    common_name_en: str
    common_name_de: Optional[str] = None
    family: Optional[str] = None
    order_name: Optional[str] = None
    native_to_europe: bool = False
    native_to_germany: bool = False
    birdnet_label: Optional[str] = None
    image_url: Optional[str] = None
    wikipedia_url: Optional[str] = None


class SpeciesListResponse(BaseModel):
    """List of species."""
    total: int
    species: List[SpeciesResponse]


@router.get("/species", response_model=SpeciesListResponse)
async def list_species(
    search: Optional[str] = Query(None, description="Search term"),
    family: Optional[str] = Query(None, description="Filter by family"),
    native_to_germany: Optional[bool] = Query(None, description="Filter by German native"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    List species from the database.

    Supports search and filtering.
    Falls back to static data if database is empty.
    """
    # Try database first
    query = select(Species)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Species.scientific_name.ilike(search_term),
                Species.common_name_en.ilike(search_term),
                Species.common_name_de.ilike(search_term),
            )
        )

    if family:
        query = query.where(Species.family == family)

    if native_to_germany is not None:
        query = query.where(Species.native_to_germany == native_to_germany)

    query = query.order_by(Species.common_name_en).offset(offset).limit(limit)

    result = await db.execute(query)
    db_species = result.scalars().all()

    if db_species:
        return SpeciesListResponse(
            total=len(db_species),
            species=[
                SpeciesResponse(
                    species_code=s.species_code,
                    scientific_name=s.scientific_name,
                    common_name_en=s.common_name_en,
                    common_name_de=s.common_name_de,
                    family=s.family,
                    order_name=s.order_name,
                    native_to_europe=s.native_to_europe,
                    native_to_germany=s.native_to_germany,
                    birdnet_label=s.birdnet_label,
                    image_url=s.image_url,
                    wikipedia_url=s.wikipedia_url,
                )
                for s in db_species
            ]
        )

    # Fallback to static data
    if search:
        species_list = search_species(search)
    else:
        species_list = EUROPEAN_SPECIES

    if family:
        species_list = [s for s in species_list if s.get("family") == family]

    if native_to_germany is not None:
        species_list = [s for s in species_list if s.get("native_to_germany") == native_to_germany]

    # Paginate
    total = len(species_list)
    species_list = species_list[offset:offset + limit]

    return SpeciesListResponse(
        total=total,
        species=[
            SpeciesResponse(**s)
            for s in species_list
        ]
    )


@router.get("/species/{species_code}", response_model=SpeciesResponse)
async def get_species(
    species_code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific species.
    """
    # Try database first
    result = await db.execute(
        select(Species).where(Species.species_code == species_code)
    )
    species = result.scalar_one_or_none()

    if species:
        return SpeciesResponse(
            species_code=species.species_code,
            scientific_name=species.scientific_name,
            common_name_en=species.common_name_en,
            common_name_de=species.common_name_de,
            family=species.family,
            order_name=species.order_name,
            native_to_europe=species.native_to_europe,
            native_to_germany=species.native_to_germany,
            birdnet_label=species.birdnet_label,
            image_url=species.image_url,
            wikipedia_url=species.wikipedia_url,
        )

    # Fallback to static data
    static_species = get_species_by_code(species_code)
    if static_species:
        return SpeciesResponse(**static_species)

    raise HTTPException(status_code=404, detail=f"Species {species_code} not found")


@router.get("/species/families")
async def list_families(
    db: AsyncSession = Depends(get_db)
):
    """
    List all bird families in the database.
    """
    from sqlalchemy import func

    # Try database
    result = await db.execute(
        select(Species.family, func.count().label("count"))
        .where(Species.family.isnot(None))
        .group_by(Species.family)
        .order_by(Species.family)
    )
    db_families = result.all()

    if db_families:
        return {
            "families": [
                {"name": f[0], "count": f[1]}
                for f in db_families
            ]
        }

    # Fallback to static data
    family_counts = {}
    for s in EUROPEAN_SPECIES:
        family = s.get("family")
        if family:
            family_counts[family] = family_counts.get(family, 0) + 1

    return {
        "families": [
            {"name": name, "count": count}
            for name, count in sorted(family_counts.items())
        ]
    }


@router.get("/species/lookup/{birdnet_label}")
async def lookup_by_birdnet_label(
    birdnet_label: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Look up species by BirdNET label.

    BirdNET labels are in format "Scientific name_Common name"
    """
    # Try database
    result = await db.execute(
        select(Species).where(Species.birdnet_label == birdnet_label)
    )
    species = result.scalar_one_or_none()

    if species:
        return SpeciesResponse(
            species_code=species.species_code,
            scientific_name=species.scientific_name,
            common_name_en=species.common_name_en,
            common_name_de=species.common_name_de,
            family=species.family,
            order_name=species.order_name,
            native_to_europe=species.native_to_europe,
            native_to_germany=species.native_to_germany,
            birdnet_label=species.birdnet_label,
        )

    # Fallback: search in static data
    from app.data.species_europe import get_species_by_birdnet_label
    static_species = get_species_by_birdnet_label(birdnet_label)

    if static_species:
        return SpeciesResponse(**static_species)

    # Try to extract from label
    if "_" in birdnet_label:
        parts = birdnet_label.split("_", 1)
        return {
            "species_code": parts[0].lower().replace(" ", "_"),
            "scientific_name": parts[0],
            "common_name_en": parts[1] if len(parts) > 1 else parts[0],
            "from_label": True,
        }

    raise HTTPException(status_code=404, detail="Species not found")
