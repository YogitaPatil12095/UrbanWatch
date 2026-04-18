"""
Gemini AI Explainable Analysis Service
Uses Google Gemini to generate plain-language explanations
of satellite data and urban change metrics.
"""
import httpx
from app.config import settings

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


async def generate_explanation(
    location_name: str,
    year_from: int,
    year_to: int,
    ndvi_from: float,
    ndvi_to: float,
    ndvi_delta: float,
    buildings: int,
    roads: int,
    area_km2: float,
    change_pct: float,
) -> dict:
    """
    Ask Gemini to explain the satellite data in plain English.
    Returns a structured explanation with summary, findings, and recommendations.
    """
    key = settings.gemini_api_key
    if not key:
        return {"error": "No Gemini API key", "available": False}

    years_span = year_to - year_from
    ndvi_change_pct = round(ndvi_delta * 100, 1)
    density = round((buildings + roads) / max(area_km2, 1), 1)

    prompt = f"""You are an urban environmental analyst. Analyze this satellite data for {location_name} and provide a clear, factual explanation.

DATA (all from real sources):
- Location: {location_name}
- Time period: {year_from} to {year_to} ({years_span} years)
- NDVI (vegetation index) in {year_from}: {ndvi_from:.4f} (source: NASA MODIS satellite)
- NDVI (vegetation index) in {year_to}: {ndvi_to:.4f} (source: NASA MODIS satellite)
- NDVI change: {ndvi_change_pct:+.1f}% ({"decline" if ndvi_delta < 0 else "improvement"})
- Buildings mapped: {buildings:,} (source: OpenStreetMap)
- Roads mapped: {roads:,} (source: OpenStreetMap)
- Analysis area: {area_km2} km²
- Urban density: {density} features/km²
- Pixel-level change detected: {change_pct:.1f}% of area

NDVI scale: -1 to +1. Values near 0 = bare soil/urban. Values 0.2-0.8 = vegetation. Values below 0.1 = very sparse vegetation.

Please provide:
1. A 2-3 sentence plain English summary of what happened to this area
2. What the NDVI change means for vegetation/environment
3. What the building/road density tells us about urbanization
4. One key concern or observation
5. Data confidence note (mention that MODIS is 250m resolution)

Keep it factual, concise, and avoid speculation. Use simple language."""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 500,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{GEMINI_URL}?key={key}",
                json=payload,
                headers={"Content-Type": "application/json"}
            )

            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return {
                    "explanation": text,
                    "available": True,
                    "model": "gemini-2.0-flash",
                }
            elif resp.status_code == 429:
                return {
                    "explanation": _fallback_explanation(
                        location_name, year_from, year_to,
                        ndvi_from, ndvi_to, ndvi_delta,
                        buildings, roads, area_km2
                    ),
                    "available": True,
                    "model": "rule-based (Gemini rate limited)",
                }
            else:
                print(f"[Gemini] Error {resp.status_code}: {resp.text[:200]}")
                return {"error": f"Gemini error {resp.status_code}", "available": False}

    except Exception as e:
        print(f"[Gemini] Exception: {e}")
        return {
            "explanation": _fallback_explanation(
                location_name, year_from, year_to,
                ndvi_from, ndvi_to, ndvi_delta,
                buildings, roads, area_km2
            ),
            "available": True,
            "model": "rule-based (Gemini unavailable)",
        }


def _fallback_explanation(
    location: str, year_from: int, year_to: int,
    ndvi_from: float, ndvi_to: float, ndvi_delta: float,
    buildings: int, roads: int, area_km2: float
) -> str:
    """Generate a rule-based explanation when Gemini is unavailable."""
    years = year_to - year_from
    ndvi_pct = abs(ndvi_delta * 100)
    density = (buildings + roads) / max(area_km2, 1)

    # NDVI interpretation
    if ndvi_delta < -0.05:
        veg_text = f"Vegetation has declined significantly — NDVI dropped {ndvi_pct:.1f}% over {years} years. This indicates substantial loss of green cover, likely due to urban expansion or land use change."
    elif ndvi_delta < -0.02:
        veg_text = f"Vegetation shows a moderate decline — NDVI dropped {ndvi_pct:.1f}% over {years} years. Some green cover has been lost but the area retains partial vegetation."
    elif ndvi_delta > 0.02:
        veg_text = f"Vegetation has improved — NDVI increased {ndvi_pct:.1f}% over {years} years. Green cover has expanded or recovered in this period."
    else:
        veg_text = f"Vegetation is relatively stable — NDVI changed by only {ndvi_pct:.1f}% over {years} years."

    # Urban density interpretation
    if density > 300:
        urban_text = f"With {buildings:,} buildings and {roads:,} roads in {area_km2} km², this is a highly dense urban area."
    elif density > 100:
        urban_text = f"With {buildings:,} buildings and {roads:,} roads in {area_km2} km², this is a moderately urbanized area."
    elif buildings > 0:
        urban_text = f"With {buildings:,} buildings and {roads:,} roads in {area_km2} km², this area has low to moderate urban development."
    else:
        urban_text = "OpenStreetMap building data is currently unavailable for this location."

    return f"{location} ({year_from}–{year_to}): {veg_text} {urban_text} Note: Satellite data from NASA MODIS at 250m resolution. NDVI values: {ndvi_from:.3f} ({year_from}) → {ndvi_to:.3f} ({year_to})."
