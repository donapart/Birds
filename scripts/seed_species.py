#!/usr/bin/env python3
"""
Seed the species database with European bird data.

Usage:
    python scripts/seed_species.py
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlalchemy import select
from app.db.database import async_session_maker, init_db
from app.db.models import Species
from app.data.species_europe import EUROPEAN_SPECIES


async def seed_species():
    """Seed species data into the database."""
    print("Initializing database...")
    await init_db()

    async with async_session_maker() as session:
        # Check existing species
        result = await session.execute(select(Species))
        existing = {s.species_code for s in result.scalars().all()}
        print(f"Found {len(existing)} existing species in database")

        # Insert new species
        added = 0
        for species_data in EUROPEAN_SPECIES:
            if species_data["species_code"] in existing:
                continue

            species = Species(
                species_code=species_data["species_code"],
                scientific_name=species_data["scientific_name"],
                common_name_en=species_data["common_name_en"],
                common_name_de=species_data.get("common_name_de"),
                family=species_data.get("family"),
                order_name=species_data.get("order_name"),
                native_to_europe=species_data.get("native_to_europe", False),
                native_to_germany=species_data.get("native_to_germany", False),
                birdnet_label=species_data.get("birdnet_label"),
            )
            session.add(species)
            added += 1

        await session.commit()
        print(f"Added {added} new species to database")
        print(f"Total species: {len(existing) + added}")


if __name__ == "__main__":
    asyncio.run(seed_species())
