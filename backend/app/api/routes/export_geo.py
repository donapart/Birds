"""
KML/KMZ Export Routes for Bird Detections

Export bird detections as KML (Keyhole Markup Language) or KMZ (compressed KML)
for use in Google Earth, QGIS, and other GIS applications.
"""

import io
import zipfile
from datetime import datetime, timedelta
from typing import Optional, List
from xml.etree import ElementTree as ET

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import Response, StreamingResponse

from app.db.database import async_session_maker
from app.db.models import Recording, Prediction

router = APIRouter(prefix="/export", tags=["export"])

# ============================================================================
# KML Generation
# ============================================================================

def create_kml_document(
    detections: List[dict],
    title: str = "BirdSound Detections",
    description: str = "Bird detections exported from BirdSound API"
) -> str:
    """
    Create a KML document from detection data.
    
    Args:
        detections: List of detection dictionaries with lat, lon, species, etc.
        title: Document title
        description: Document description
        
    Returns:
        KML XML string
    """
    # KML namespace
    kml_ns = "http://www.opengis.net/kml/2.2"
    gx_ns = "http://www.google.com/kml/ext/2.2"
    
    # Register namespaces
    ET.register_namespace('', kml_ns)
    ET.register_namespace('gx', gx_ns)
    
    # Root element
    kml = ET.Element('kml', xmlns=kml_ns)
    
    # Document
    document = ET.SubElement(kml, 'Document')
    
    # Document name and description
    name = ET.SubElement(document, 'name')
    name.text = title
    
    desc = ET.SubElement(document, 'description')
    desc.text = description
    
    # Styles for different confidence levels
    styles = [
        ('high-confidence', '#00FF00', 1.2),    # Green for >70%
        ('medium-confidence', '#FFFF00', 1.0),  # Yellow for 40-70%
        ('low-confidence', '#FF6600', 0.8),     # Orange for <40%
    ]
    
    for style_id, color, scale in styles:
        style = ET.SubElement(document, 'Style', id=style_id)
        icon_style = ET.SubElement(style, 'IconStyle')
        
        color_el = ET.SubElement(icon_style, 'color')
        # KML uses AABBGGRR format
        color_el.text = f'ff{color[5:7]}{color[3:5]}{color[1:3]}'
        
        scale_el = ET.SubElement(icon_style, 'scale')
        scale_el.text = str(scale)
        
        icon = ET.SubElement(icon_style, 'Icon')
        href = ET.SubElement(icon, 'href')
        href.text = 'http://maps.google.com/mapfiles/kml/shapes/bird.png'
        
        # Label style
        label_style = ET.SubElement(style, 'LabelStyle')
        label_scale = ET.SubElement(label_style, 'scale')
        label_scale.text = str(scale)
    
    # Bird icon style
    bird_style = ET.SubElement(document, 'Style', id='bird-icon')
    icon_style = ET.SubElement(bird_style, 'IconStyle')
    icon = ET.SubElement(icon_style, 'Icon')
    href = ET.SubElement(icon, 'href')
    href.text = 'http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png'
    
    # Create folder for detections
    folder = ET.SubElement(document, 'Folder')
    folder_name = ET.SubElement(folder, 'name')
    folder_name.text = 'Detections'
    
    # Group by species
    species_groups = {}
    for det in detections:
        species = det.get('species_common', det.get('species_scientific', 'Unknown'))
        if species not in species_groups:
            species_groups[species] = []
        species_groups[species].append(det)
    
    # Create subfolder for each species
    for species, species_dets in sorted(species_groups.items()):
        species_folder = ET.SubElement(folder, 'Folder')
        sf_name = ET.SubElement(species_folder, 'name')
        sf_name.text = f"{species} ({len(species_dets)})"
        
        for det in species_dets:
            placemark = create_placemark(det)
            species_folder.append(placemark)
    
    # Convert to string
    return ET.tostring(kml, encoding='unicode', xml_declaration=True)


def create_placemark(detection: dict) -> ET.Element:
    """Create a KML Placemark element for a detection."""
    placemark = ET.Element('Placemark')
    
    # Name
    name = ET.SubElement(placemark, 'name')
    species = detection.get('species_common', detection.get('species_scientific', 'Unknown'))
    confidence = detection.get('confidence', 0) * 100
    name.text = f"{species} ({confidence:.0f}%)"
    
    # Description with HTML
    desc = ET.SubElement(placemark, 'description')
    desc_html = f"""<![CDATA[
<h3>{species}</h3>
<table>
<tr><td><b>Wissenschaftlich:</b></td><td>{detection.get('species_scientific', 'N/A')}</td></tr>
<tr><td><b>Konfidenz:</b></td><td>{confidence:.1f}%</td></tr>
<tr><td><b>Zeitpunkt:</b></td><td>{detection.get('timestamp', 'N/A')}</td></tr>
<tr><td><b>Modell:</b></td><td>{detection.get('model', 'N/A')}</td></tr>
<tr><td><b>Koordinaten:</b></td><td>{detection.get('latitude', 0):.6f}, {detection.get('longitude', 0):.6f}</td></tr>
</table>
]]>"""
    desc.text = desc_html
    
    # Style based on confidence
    style_url = ET.SubElement(placemark, 'styleUrl')
    if confidence >= 70:
        style_url.text = '#high-confidence'
    elif confidence >= 40:
        style_url.text = '#medium-confidence'
    else:
        style_url.text = '#low-confidence'
    
    # Timestamp
    if 'timestamp' in detection:
        timestamp = ET.SubElement(placemark, 'TimeStamp')
        when = ET.SubElement(timestamp, 'when')
        ts = detection['timestamp']
        if isinstance(ts, str):
            when.text = ts
        else:
            when.text = ts.isoformat()
    
    # Extended data
    extended = ET.SubElement(placemark, 'ExtendedData')
    
    data_fields = [
        ('species_scientific', 'Wissenschaftlicher Name'),
        ('species_code', 'Artencode'),
        ('confidence', 'Konfidenz'),
        ('model', 'Modell'),
        ('device_id', 'Gerät'),
    ]
    
    for field, display_name in data_fields:
        if field in detection:
            data = ET.SubElement(extended, 'Data', name=field)
            display = ET.SubElement(data, 'displayName')
            display.text = display_name
            value = ET.SubElement(data, 'value')
            val = detection[field]
            if field == 'confidence':
                value.text = f"{val * 100:.1f}%"
            else:
                value.text = str(val)
    
    # Point coordinates
    point = ET.SubElement(placemark, 'Point')
    coords = ET.SubElement(point, 'coordinates')
    lat = detection.get('latitude', 0)
    lon = detection.get('longitude', 0)
    alt = detection.get('altitude', 0)
    coords.text = f"{lon},{lat},{alt}"
    
    return placemark


def create_kmz(kml_content: str, filename: str = "doc.kml") -> bytes:
    """
    Create a KMZ file (compressed KML) from KML content.
    
    Args:
        kml_content: KML XML string
        filename: Name of the KML file inside the KMZ
        
    Returns:
        KMZ file as bytes
    """
    buffer = io.BytesIO()
    
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(filename, kml_content)
    
    buffer.seek(0)
    return buffer.getvalue()


# ============================================================================
# API Routes
# ============================================================================

@router.get("/kml")
async def export_kml(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    species: Optional[str] = Query(None, description="Filter by species"),
    min_confidence: float = Query(0.1, description="Minimum confidence threshold"),
    limit: int = Query(1000, description="Maximum number of detections")
) -> Response:
    """
    Export detections as KML file.
    
    Returns a KML file that can be opened in Google Earth, QGIS, etc.
    """
    # Get detections from database
    detections = await get_detections_for_export(
        start_date, end_date, species, min_confidence, limit
    )
    
    if not detections:
        # Return empty KML
        kml_content = create_kml_document([], "BirdSound - Keine Daten", "Keine Erkennungen gefunden")
    else:
        title = f"BirdSound Detections ({len(detections)} Erkennungen)"
        desc = f"Exportiert am {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        if start_date or end_date:
            desc += f"\nZeitraum: {start_date or 'Anfang'} bis {end_date or 'Heute'}"
        
        kml_content = create_kml_document(detections, title, desc)
    
    filename = f"birdsound_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.kml"
    
    return Response(
        content=kml_content,
        media_type="application/vnd.google-earth.kml+xml",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/kmz")
async def export_kmz(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    species: Optional[str] = Query(None, description="Filter by species"),
    min_confidence: float = Query(0.1, description="Minimum confidence threshold"),
    limit: int = Query(1000, description="Maximum number of detections")
) -> Response:
    """
    Export detections as KMZ file (compressed KML).
    
    KMZ is a compressed version of KML, smaller file size.
    """
    # Get detections
    detections = await get_detections_for_export(
        start_date, end_date, species, min_confidence, limit
    )
    
    title = f"BirdSound Detections ({len(detections)} Erkennungen)"
    desc = f"Exportiert am {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    
    kml_content = create_kml_document(detections, title, desc)
    kmz_content = create_kmz(kml_content)
    
    filename = f"birdsound_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.kmz"
    
    return Response(
        content=kmz_content,
        media_type="application/vnd.google-earth.kmz",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/geojson")
async def export_geojson(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    species: Optional[str] = Query(None, description="Filter by species"),
    min_confidence: float = Query(0.1, description="Minimum confidence threshold"),
    limit: int = Query(1000, description="Maximum number of detections")
) -> dict:
    """
    Export detections as GeoJSON.
    
    Standard format for web mapping applications.
    """
    detections = await get_detections_for_export(
        start_date, end_date, species, min_confidence, limit
    )
    
    features = []
    for det in detections:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [
                    det.get('longitude', 0),
                    det.get('latitude', 0)
                ]
            },
            "properties": {
                "species_common": det.get('species_common'),
                "species_scientific": det.get('species_scientific'),
                "confidence": det.get('confidence'),
                "timestamp": str(det.get('timestamp', '')),
                "model": det.get('model'),
                "device_id": det.get('device_id')
            }
        }
        features.append(feature)
    
    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "exported_at": datetime.now().isoformat(),
            "total_count": len(features),
            "source": "BirdSound API"
        }
    }


async def get_detections_for_export(
    start_date: Optional[str],
    end_date: Optional[str],
    species: Optional[str],
    min_confidence: float,
    limit: int
) -> List[dict]:
    """
    Get detections from database for export.
    
    Returns list of detection dictionaries.
    """
    try:
        async with async_session_maker() as session:
            from sqlalchemy import select, and_
            from sqlalchemy.orm import selectinload
            
            # Build query
            query = select(Recording).options(selectinload(Recording.detections))
            
            conditions = []
            
            # Date filters
            if start_date:
                try:
                    start_dt = datetime.fromisoformat(start_date)
                    conditions.append(Recording.timestamp_utc >= start_dt)
                except ValueError:
                    pass
            
            if end_date:
                try:
                    end_dt = datetime.fromisoformat(end_date) + timedelta(days=1)
                    conditions.append(Recording.timestamp_utc < end_dt)
                except ValueError:
                    pass
            
            if conditions:
                query = query.where(and_(*conditions))
            
            query = query.limit(limit)
            
            result = await session.execute(query)
            recordings = result.scalars().all()
            
            # Flatten detections
            detections = []
            for rec in recordings:
                for det in rec.predictions:
                    if det.confidence >= min_confidence:
                        # Species filter
                        if species:
                            if species.lower() not in (det.species_common or '').lower() and \
                               species.lower() not in (det.species_scientific or '').lower():
                                continue
                        
                        detections.append({
                            'species_common': det.species_common,
                            'species_scientific': det.species_scientific,
                            'species_code': det.species_code,
                            'confidence': det.confidence,
                            'timestamp': rec.timestamp_utc,
                            'latitude': rec.latitude,
                            'longitude': rec.longitude,
                            'model': det.model_name,
                            'device_id': rec.device_id
                        })
            
            return detections
            
    except Exception as e:
        # Return demo data if database not available
        return get_demo_detections()


def get_demo_detections() -> List[dict]:
    """Return demo detection data for testing."""
    return [
        {
            'species_common': 'Amsel',
            'species_scientific': 'Turdus merula',
            'species_code': 'turmer',
            'confidence': 0.92,
            'timestamp': datetime.now() - timedelta(hours=2),
            'latitude': 52.520,
            'longitude': 13.405,
            'model': 'BirdNET',
            'device_id': 'demo'
        },
        {
            'species_common': 'Rotkehlchen',
            'species_scientific': 'Erithacus rubecula',
            'species_code': 'erirub',
            'confidence': 0.85,
            'timestamp': datetime.now() - timedelta(hours=1),
            'latitude': 52.521,
            'longitude': 13.406,
            'model': 'BirdNET',
            'device_id': 'demo'
        },
        {
            'species_common': 'Kohlmeise',
            'species_scientific': 'Parus major',
            'species_code': 'parmaj',
            'confidence': 0.78,
            'timestamp': datetime.now() - timedelta(minutes=30),
            'latitude': 52.519,
            'longitude': 13.404,
            'model': 'DimaBird',
            'device_id': 'demo'
        },
        {
            'species_common': 'Buchfink',
            'species_scientific': 'Fringilla coelebs',
            'species_code': 'fricoe',
            'confidence': 0.65,
            'timestamp': datetime.now() - timedelta(minutes=15),
            'latitude': 52.522,
            'longitude': 13.407,
            'model': 'BirdNET',
            'device_id': 'demo'
        },
        {
            'species_common': 'Zilpzalp',
            'species_scientific': 'Phylloscopus collybita',
            'species_code': 'phycol',
            'confidence': 0.45,
            'timestamp': datetime.now(),
            'latitude': 52.518,
            'longitude': 13.403,
            'model': 'DimaBird',
            'device_id': 'demo'
        }
    ]
