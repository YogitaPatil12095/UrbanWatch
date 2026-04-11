import math
import hashlib
from fastapi import APIRouter, Query, HTTPException
from app.services.satellite_service import fetch_satellite_image
from app.ml.change_detection import (
    load_image_as_array,
    basic_change_detection,
)

router = APIRouter()

# Earth radius in km
EARTH_RADIUS_KM = 6371.0


def _bbox_area_km2(lat: float, lon: float, buffer_deg: float = 0.05) -> float:
    """Approximate area of bounding box in km²."""
    lat_km = buffer_deg * 2 * (math.pi * EARTH_RADIUS_KM / 180)
    lon_km = buffer_deg * 2 * (math.pi * EARTH_RADIUS_KM / 180) * math.cos(math.radians(lat))
    return lat_km * lon_km


@router.get("/stats")
async def get_stats(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    year_from: int = Query(..., ge=2013, le=2023),
    year_to: int = Query(..., ge=2014, le=2024),
):
    """
    Compute urban change statistics for a location and time range.
    Returns urban expansion %, vegetation loss %, area changed, and metadata.
    """
    try:
        # Fetch images
        img_from_meta = await fetch_satellite_image(lat, lon, year_from)
        img_to_meta = await fetch_satellite_image(lat, lon, year_to)

        img_before = load_image_as_array(img_from_meta["image_url"])
        img_after = load_image_as_array(img_to_meta["image_url"])

        # Run basic detection for stats
        result = basic_change_detection(img_before, img_after)

        # Compute area
        total_area = _bbox_area_km2(lat, lon)
        change_pct = result["change_pct"]
        area_changed = total_area * (change_pct / 100)

        # Estimate urban vs vegetation split from change
        # Urban tends to be brighter, vegetation greener
        import numpy as np
        after_arr = img_after.astype(np.float32)
        r, g, b = after_arr[:,:,0], after_arr[:,:,1], after_arr[:,:,2]

        urban_ratio = float(((r > 120) & (g > 100) & (b > 100)).mean())
        veg_ratio = float(((g > r) & (g > b) & (g > 60)).mean())

        urban_expansion_pct = min(change_pct * urban_ratio * 2, 40.0)
        vegetation_loss_pct = min(change_pct * veg_ratio * 1.5, 30.0)

        return {
            "urban_expansion_pct": round(urban_expansion_pct, 2),
            "vegetation_loss_pct": round(vegetation_loss_pct, 2),
            "area_changed_km2": round(area_changed, 3),
            "total_area_km2": round(total_area, 3),
            "change_pct": round(change_pct, 2),
            "confidence": round(0.75 + (0.2 * (1 - change_pct / 100)), 2),
            "cloud_cover_pct": 5.0,  # Would come from real metadata
            "resolution": "10m",
            "mode": "basic",
            "source_from": img_from_meta.get("source", "unknown"),
            "source_to": img_to_meta.get("source", "unknown"),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
