from fastapi import APIRouter, Query, HTTPException
from app.services.satellite_service import fetch_satellite_image

router = APIRouter()


@router.get("/satellite")
async def get_satellite_image(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    year: int = Query(..., ge=2013, le=2024, description="Year"),
):
    """
    Fetch satellite image for a given location and year.
    Returns image URL and metadata.
    """
    try:
        result = await fetch_satellite_image(lat, lon, year)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
