"""
Xeno-canto API Service for bird sound reference recordings.

Xeno-canto is the world's largest database of bird sound recordings,
contributed by birdwatchers from around the world.

Website: https://xeno-canto.org
API Docs: https://xeno-canto.org/explore/api
"""
import logging
import asyncio
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
import aiohttp

logger = logging.getLogger(__name__)


@dataclass
class XenoCantoRecording:
    """A recording from Xeno-canto."""
    id: str
    species: str
    scientific_name: str
    common_name: str
    country: str
    location: str
    latitude: Optional[float]
    longitude: Optional[float]
    quality: str  # A, B, C, D, E
    length: str  # Duration string
    file_url: str
    sonogram_url: Optional[str]
    recordist: str
    remarks: Optional[str]
    type: str  # e.g., "song", "call", "alarm call"


class XenoCantoService:
    """
    Service for accessing Xeno-canto bird sound database.
    
    Features:
    - Search recordings by species, location, quality
    - Get reference recordings for species validation
    - Download audio files for comparison
    - Get sonograms for visual comparison
    
    Rate limit: 1000 requests/hour
    """
    
    BASE_URL = "https://xeno-canto.org/api/2/recordings"
    
    def __init__(self, cache_enabled: bool = True):
        """
        Initialize Xeno-canto service.
        
        Args:
            cache_enabled: Whether to cache API responses
        """
        self.cache_enabled = cache_enabled
        self._cache: Dict[str, Any] = {}
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create HTTP session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                headers={
                    "User-Agent": "BirdSound-App/1.0 (https://github.com/birdsound)"
                }
            )
        return self._session
    
    async def close(self) -> None:
        """Close HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()
    
    async def search(
        self,
        query: Optional[str] = None,
        species: Optional[str] = None,
        country: Optional[str] = None,
        location: Optional[str] = None,
        quality: Optional[str] = None,  # "A", "A B", etc.
        type_: Optional[str] = None,  # "song", "call"
        page: int = 1,
        per_page: int = 10
    ) -> Dict[str, Any]:
        """
        Search Xeno-canto recordings.
        
        Args:
            query: Free-text search query
            species: Scientific name of species
            country: Country code or name
            location: Location string
            quality: Quality filter (A=best, E=worst)
            type_: Vocalization type filter
            page: Page number
            per_page: Results per page (max 500)
            
        Returns:
            Dict with recordings and metadata
        """
        # Build query string
        parts = []
        
        if query:
            parts.append(query)
        if species:
            parts.append(f'"{species}"')
        if country:
            parts.append(f"cnt:{country}")
        if location:
            parts.append(f"loc:{location}")
        if quality:
            parts.append(f"q:{quality}")
        if type_:
            parts.append(f"type:{type_}")
        
        query_str = " ".join(parts) if parts else "*"
        
        # Check cache
        cache_key = f"{query_str}_{page}_{per_page}"
        if self.cache_enabled and cache_key in self._cache:
            return self._cache[cache_key]
        
        try:
            session = await self._get_session()
            
            async with session.get(
                self.BASE_URL,
                params={
                    "query": query_str,
                    "page": page
                }
            ) as response:
                if response.status != 200:
                    logger.error(f"Xeno-canto API error: {response.status}")
                    return {"recordings": [], "error": f"API error: {response.status}"}
                
                data = await response.json()
                
                # Parse recordings
                recordings = []
                for rec in data.get("recordings", [])[:per_page]:
                    recordings.append(self._parse_recording(rec))
                
                result = {
                    "recordings": recordings,
                    "total": int(data.get("numRecordings", 0)),
                    "num_species": int(data.get("numSpecies", 0)),
                    "page": page,
                    "pages": int(data.get("numPages", 1))
                }
                
                # Cache result
                if self.cache_enabled:
                    self._cache[cache_key] = result
                
                return result
                
        except Exception as e:
            logger.error(f"Xeno-canto search failed: {e}")
            return {"recordings": [], "error": str(e)}
    
    def _parse_recording(self, data: Dict) -> XenoCantoRecording:
        """Parse raw API response to Recording object."""
        return XenoCantoRecording(
            id=data.get("id", ""),
            species=data.get("sp", ""),
            scientific_name=data.get("gen", "") + " " + data.get("sp", ""),
            common_name=data.get("en", ""),
            country=data.get("cnt", ""),
            location=data.get("loc", ""),
            latitude=float(data["lat"]) if data.get("lat") else None,
            longitude=float(data["lng"]) if data.get("lng") else None,
            quality=data.get("q", ""),
            length=data.get("length", ""),
            file_url=data.get("file", ""),
            sonogram_url=data.get("sono", {}).get("full") if data.get("sono") else None,
            recordist=data.get("rec", ""),
            remarks=data.get("rmk"),
            type=data.get("type", "")
        )
    
    async def get_species_recordings(
        self,
        scientific_name: str,
        quality: str = "A B",
        limit: int = 5,
        type_: Optional[str] = None
    ) -> List[XenoCantoRecording]:
        """
        Get high-quality recordings for a species.
        
        Args:
            scientific_name: Scientific name (e.g., "Turdus merula")
            quality: Quality filter (default: A and B quality)
            limit: Maximum recordings to return
            type_: Optional vocalization type filter
            
        Returns:
            List of recordings sorted by quality
        """
        result = await self.search(
            species=scientific_name,
            quality=quality,
            type_=type_,
            per_page=limit
        )
        
        return result.get("recordings", [])
    
    async def get_reference_for_validation(
        self,
        scientific_name: str,
        detected_type: Optional[str] = None
    ) -> Optional[XenoCantoRecording]:
        """
        Get a single high-quality reference recording for validation.
        
        Useful for comparing a detection against a known good recording.
        
        Args:
            scientific_name: Species to get reference for
            detected_type: Type of vocalization detected
            
        Returns:
            Best available recording or None
        """
        # Try to get matching type first
        if detected_type:
            recordings = await self.get_species_recordings(
                scientific_name,
                quality="A",
                limit=1,
                type_=detected_type
            )
            if recordings:
                return recordings[0]
        
        # Fall back to any high-quality recording
        recordings = await self.get_species_recordings(
            scientific_name,
            quality="A",
            limit=1
        )
        
        return recordings[0] if recordings else None
    
    async def get_european_species(
        self,
        country: str = "Germany"
    ) -> List[Dict[str, Any]]:
        """
        Get list of species recorded in a European country.
        
        Args:
            country: Country name
            
        Returns:
            List of species with recording counts
        """
        result = await self.search(country=country, per_page=1)
        
        # API returns species summary in metadata
        return result
    
    async def download_audio(
        self,
        recording: XenoCantoRecording,
        output_path: str
    ) -> bool:
        """
        Download recording audio file.
        
        Args:
            recording: Recording to download
            output_path: Path to save file
            
        Returns:
            True if successful
        """
        try:
            session = await self._get_session()
            
            async with session.get(recording.file_url) as response:
                if response.status != 200:
                    return False
                
                with open(output_path, 'wb') as f:
                    async for chunk in response.content.iter_chunked(8192):
                        f.write(chunk)
                
                return True
                
        except Exception as e:
            logger.error(f"Download failed: {e}")
            return False


# Singleton instance
_xeno_canto_service: Optional[XenoCantoService] = None


def get_xeno_canto_service() -> XenoCantoService:
    """Get shared Xeno-canto service instance."""
    global _xeno_canto_service
    if _xeno_canto_service is None:
        _xeno_canto_service = XenoCantoService()
    return _xeno_canto_service


# Example usage and testing
async def test_xeno_canto():
    """Test Xeno-canto API integration."""
    service = XenoCantoService()
    
    try:
        # Search for Blackbird songs
        print("Searching for Blackbird songs...")
        results = await service.search(
            species="Turdus merula",
            type_="song",
            quality="A",
            per_page=3
        )
        
        print(f"Found {results['total']} recordings")
        
        for rec in results['recordings']:
            print(f"  - {rec.common_name} ({rec.quality}): {rec.length}")
            print(f"    Location: {rec.location}, {rec.country}")
            print(f"    URL: {rec.file_url}")
            print()
        
        # Get reference for validation
        print("Getting reference recording for validation...")
        ref = await service.get_reference_for_validation("Erithacus rubecula", "song")
        if ref:
            print(f"Reference: {ref.common_name} - {ref.file_url}")
        
    finally:
        await service.close()


if __name__ == "__main__":
    asyncio.run(test_xeno_canto())
