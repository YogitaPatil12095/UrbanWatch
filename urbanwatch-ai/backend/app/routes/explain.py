"""
Explainable AI endpoint using Google Gemini.
"""
import traceback
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.gemini_service import generate_explanation

router = APIRouter()


class ExplainRequest(BaseModel):
    location_name: str = Field(..., description="City/location name")
    year_from: int = Field(..., ge=2000, le=2023)
    year_to: int = Field(..., ge=2001, le=2024)
    ndvi_from: float = Field(0.15)
    ndvi_to: float = Field(0.12)
    ndvi_delta: float = Field(-0.03)
    buildings: int = Field(0)
    roads: int = Field(0)
    area_km2: float = Field(100.0)
    change_pct: float = Field(0.0)


@router.post("/explain")
async def explain_analysis(req: ExplainRequest):
    """
    Generate a plain-language AI explanation of the satellite analysis.
    Uses Google Gemini to interpret real NASA + OSM data.
    """
    try:
        result = await generate_explanation(
            location_name=req.location_name,
            year_from=req.year_from,
            year_to=req.year_to,
            ndvi_from=req.ndvi_from,
            ndvi_to=req.ndvi_to,
            ndvi_delta=req.ndvi_delta,
            buildings=req.buildings,
            roads=req.roads,
            area_km2=req.area_km2,
            change_pct=req.change_pct,
        )
        return result
    except Exception as e:
        print(f"[explain] ERROR: {traceback.format_exc()}")
        raise HTTPException(500, str(e))
