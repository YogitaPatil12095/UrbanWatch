import hashlib
import traceback
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.satellite_service import fetch_satellite_image
from app.ml.change_detection import (
    load_image_as_array,
    basic_change_detection,
    advanced_change_detection,
    save_change_map,
)

router = APIRouter()


class ChangeDetectionRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    year_from: int = Field(..., ge=2013, le=2023)
    year_to: int = Field(..., ge=2014, le=2024)
    mode: str = Field("basic", pattern="^(basic|advanced)$")


@router.post("/detect-change")
async def detect_change(req: ChangeDetectionRequest):
    """
    Run change detection between two years for a location.
    Returns change map URL and detection statistics.
    """
    if req.year_from >= req.year_to:
        raise HTTPException(status_code=400, detail="year_from must be less than year_to")

    try:
        # Fetch both images
        img_from_meta = await fetch_satellite_image(req.lat, req.lon, req.year_from)
        img_to_meta = await fetch_satellite_image(req.lat, req.lon, req.year_to)

        # Load as numpy arrays
        img_before = load_image_as_array(img_from_meta["image_url"])
        img_after = load_image_as_array(img_to_meta["image_url"])

        # Run detection
        if req.mode == "advanced":
            result = advanced_change_detection(img_before, img_after)
        else:
            result = basic_change_detection(img_before, img_after)

        # Save change map
        cache_key = hashlib.md5(
            f"{req.lat:.4f}_{req.lon:.4f}_{req.year_from}_{req.year_to}_{req.mode}".encode()
        ).hexdigest()
        change_map_url = save_change_map(result, cache_key)

        return {
            "change_map_url": change_map_url,
            "change_pct": result.get("change_pct", 0),
            "urban_pct": result.get("urban_pct", 0),
            "vegetation_pct": result.get("vegetation_pct", 0),
            "mode": result.get("mode", req.mode),
            "year_from": req.year_from,
            "year_to": req.year_to,
        }

    except Exception as e:
        print(f"[detect-change] ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
