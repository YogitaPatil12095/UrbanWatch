"""
Real Stats endpoint — returns verified data from open public sources.
No API keys required.
"""
import traceback
from fastapi import APIRouter, Query, HTTPException
from app.services.real_data_service import (
    fetch_osm_change_estimate,
    fetch_location_info,
    fetch_modis_ndvi,
)

router = APIRouter()


@router.get("/real-stats")
async def get_real_stats(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    year_from: int = Query(..., ge=2000, le=2023),
    year_to: int = Query(..., ge=2001, le=2024),
):
    """
    Returns real urban and environmental statistics from:
    - OpenStreetMap (building/road counts)
    - NASA MODIS NDVI (vegetation index)
    - Nominatim (location info)

    All sources are free and open — no API keys needed.
    """
    try:
        # Run all fetches
        location_info, osm_data, ndvi_data = await _gather(lat, lon, year_from, year_to)

        return {
            # Location
            "location": location_info,

            # OSM real counts
            "buildings_count":     osm_data["buildings_count"],
            "roads_count":         osm_data["roads_count"],
            "urban_features":      osm_data["urban_features"],
            "vegetation_features": osm_data["vegetation_features"],
            "area_km2":            osm_data["area_km2"],
            "urban_density_per_km2": osm_data["urban_density_per_km2"],

            # NDVI real values
            "ndvi_from":  ndvi_data["ndvi_from"],
            "ndvi_to":    ndvi_data["ndvi_to"],
            "ndvi_delta": ndvi_data["ndvi_delta"],
            "ndvi_source": ndvi_data["source"],

            # Derived estimates
            "urban_expansion_pct":  osm_data["urban_expansion_pct"],
            "vegetation_loss_pct":  osm_data["vegetation_loss_pct"],
            "infra_density":        osm_data["infra_density"],

            # Meta
            "years_span":   osm_data["years_span"],
            "confidence":   osm_data["confidence"],
            "data_sources": osm_data["data_sources"],

            # Interpretation for viewers
            "interpretation": _interpret(osm_data, ndvi_data),
        }

    except Exception as e:
        print(f"[real-stats] ERROR: {traceback.format_exc()}")
        raise HTTPException(500, str(e))


async def _gather(lat, lon, year_from, year_to):
    """Fetch all data sources concurrently."""
    import asyncio
    location_task = fetch_location_info(lat, lon)
    osm_task      = fetch_osm_change_estimate(lat, lon, year_from, year_to)
    ndvi_task     = fetch_modis_ndvi(lat, lon, year_from, year_to)
    return await asyncio.gather(location_task, osm_task, ndvi_task)


def _interpret(osm: dict, ndvi: dict) -> dict:
    """Generate plain-language interpretation of the data."""
    msgs = []
    alerts = []

    buildings = osm.get("buildings_count", 0)
    roads     = osm.get("roads_count", 0)
    ndvi_d    = ndvi.get("ndvi_delta", 0)
    area      = osm.get("area_km2", 25)

    # Building density
    density = (buildings + roads) / max(area, 1)
    if density > 50:
        msgs.append(f"High urban density: {buildings} buildings and {roads} roads in {area} km²")
        alerts.append({"type": "warning", "msg": "Dense urban area detected"})
    elif density > 20:
        msgs.append(f"Moderate urban density: {buildings} buildings in {area} km²")
    else:
        msgs.append(f"Low urban density: {buildings} buildings in {area} km²")

    # NDVI trend
    if ndvi_d < -0.05:
        msgs.append(f"Vegetation declined significantly (NDVI: {ndvi_d:+.3f})")
        alerts.append({"type": "danger", "msg": f"Vegetation loss: NDVI dropped {ndvi_d*100:.1f}%"})
    elif ndvi_d < -0.02:
        msgs.append(f"Slight vegetation decline (NDVI: {ndvi_d:+.3f})")
    elif ndvi_d > 0.02:
        msgs.append(f"Vegetation improved (NDVI: {ndvi_d:+.3f})")
    else:
        msgs.append(f"Vegetation stable (NDVI change: {ndvi_d:+.3f})")

    return {
        "summary": msgs,
        "alerts": alerts,
        "data_note": "Building/road counts from OpenStreetMap (current). NDVI from NASA MODIS satellite data.",
    }
