"""
Satellite imagery service.
Priority:
  1. NASA GIBS (MODIS/Landsat) — FREE, no API key, real satellite data
  2. Google Earth Engine — requires service account
  3. Sentinel Hub — requires credentials
  4. Synthetic fallback — demo only
"""
import os
import math
import hashlib
import httpx
import numpy as np
from PIL import Image
from pathlib import Path
from app.config import settings

STATIC_DIR = Path("static/images")
STATIC_DIR.mkdir(parents=True, exist_ok=True)

# NASA GIBS layer selection by year
# MODIS Terra True Color: daily, 2000–present, 250m resolution, NO KEY NEEDED
# Landsat 8: 2013–present (when available in GIBS)
def _gibs_layer_for_year(year: int) -> tuple[str, str]:
    """Return (layer_name, tile_matrix_set) for a given year."""
    if year >= 2013:
        # Landsat 8 true color (30m) — best quality
        return "Landsat_8_OLI_True_Color", "GoogleMapsCompatible_Level12"
    else:
        # MODIS Terra true color (250m) — available from 2000
        return "MODIS_Terra_CorrectedReflectance_TrueColor", "GoogleMapsCompatible_Level9"


def _lat_lon_to_tile_epsg4326(lat: float, lon: float, zoom: int) -> tuple[int, int]:
    """
    Convert lat/lon to EPSG:4326 tile row/col for NASA GIBS.
    EPSG4326 grid: 2^zoom cols, 2^(zoom-1) rows.
    """
    col = int((lon + 180.0) / 360.0 * (2 ** zoom))
    row = int((90.0 - lat) / 180.0 * (2 ** (zoom - 1)))
    # Clamp to valid range
    max_col = 2 ** zoom - 1
    max_row = 2 ** (zoom - 1) - 1
    col = max(0, min(col, max_col))
    row = max(0, min(row, max_row))
    return row, col


async def _fetch_nasa_gibs(lat: float, lon: float, year: int, cache_path: Path) -> dict | None:
    """
    Fetch real satellite imagery from NASA GIBS (Global Imagery Browse Services).
    Completely FREE — no API key, no registration required.
    Uses MODIS Terra True Color (250m resolution), available 2000–present.
    Source: https://nasa-gibs.github.io/gibs-api-docs/
    """
    layer = "MODIS_Terra_CorrectedReflectance_TrueColor"
    tile_matrix_set = "250m"

    # Use summer date for best cloud-free imagery over most regions
    date_str = f"{year}-07-01"

    # Zoom 6 = ~300km tile width, good for city-scale urban analysis
    zoom = 6
    row, col = _lat_lon_to_tile_epsg4326(lat, lon, zoom)

    # NASA GIBS WMTS REST endpoint (EPSG:4326)
    url = (
        f"https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/"
        f"{layer}/default/{date_str}/{tile_matrix_set}/{zoom}/{row}/{col}.jpg"
    )

    print(f"[GIBS] Fetching MODIS {year} tile z={zoom} row={row} col={col}")

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        resp = await client.get(url)
        if resp.status_code != 200:
            print(f"[GIBS] HTTP {resp.status_code}")
            return None
        if len(resp.content) < 5000:
            print(f"[GIBS] Tile too small ({len(resp.content)}B) — likely empty")
            return None

        cache_path.write_bytes(resp.content)

    print(f"[GIBS] ✓ Real MODIS satellite image: {len(resp.content)} bytes")
    return {
        "image_url": f"/static/images/{cache_path.name}",
        "source": "nasa_gibs_modis",
        "year": year,
        "lat": lat,
        "lon": lon,
        "date": date_str,
        "layer": layer,
        "resolution": "250m",
        "tile": f"z{zoom}/r{row}/c{col}",
    }


# Try to initialize GEE
_gee_initialized = False

def _init_gee():
    global _gee_initialized
    if _gee_initialized:
        return True
    if not settings.gee_service_account or not os.path.exists(settings.gee_private_key_file):
        return False
    try:
        import ee
        credentials = ee.ServiceAccountCredentials(
            settings.gee_service_account,
            settings.gee_private_key_file,
        )
        ee.Initialize(credentials)
        _gee_initialized = True
        return True
    except Exception as e:
        print(f"[GEE] Init failed: {e}")
        return False


async def fetch_satellite_image(lat: float, lon: float, year: int) -> dict:
    """
    Fetch satellite image for a location and year.
    Priority: NASA GIBS (free, real) → GEE → Sentinel Hub → Synthetic
    """
    cache_key = hashlib.md5(f"{lat:.4f}_{lon:.4f}_{year}".encode()).hexdigest()
    cache_path = STATIC_DIR / f"sat_{cache_key}.jpg"

    if cache_path.exists():
        return {
            "image_url": f"/static/images/sat_{cache_key}.jpg",
            "source": "cache",
            "year": year,
            "lat": lat,
            "lon": lon,
        }

    # 1. NASA GIBS — free, real satellite data, no key needed
    try:
        result = await _fetch_nasa_gibs(lat, lon, year, cache_path)
        if result:
            print(f"[GIBS] ✓ Real satellite image fetched for {year}")
            return result
    except Exception as e:
        print(f"[GIBS] Failed: {e}")

    # 2. Google Earth Engine (if credentials provided)
    if _init_gee():
        try:
            result = await _fetch_gee(lat, lon, year, cache_path)
            if result:
                return result
        except Exception as e:
            print(f"[GEE] Fetch failed: {e}")

    # 3. Sentinel Hub (if credentials provided)
    if settings.sentinelhub_client_id:
        try:
            result = await _fetch_sentinelhub(lat, lon, year, cache_path)
            if result:
                return result
        except Exception as e:
            print(f"[SentinelHub] Fetch failed: {e}")

    # 4. Synthetic fallback
    print(f"[Satellite] All real sources failed, using synthetic for {year}")
    return await _fetch_synthetic(lat, lon, year, cache_path)


async def _fetch_gee(lat: float, lon: float, year: int, cache_path: Path) -> dict | None:
    """Fetch Sentinel-2 composite from Google Earth Engine."""
    import ee

    point = ee.Geometry.Point([lon, lat])
    region = point.buffer(5000).bounds()

    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterDate(f"{year}-01-01", f"{year}-12-31")
        .filterBounds(region)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
        .select(["B4", "B3", "B2"])
        .median()
    )

    url = collection.getThumbURL({
        "region": region,
        "dimensions": 512,
        "format": "jpg",
        "min": 0,
        "max": 3000,
        "gamma": 1.4,
    })

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        cache_path.write_bytes(resp.content)

    return {
        "image_url": f"/static/images/{cache_path.name}",
        "source": "google_earth_engine",
        "year": year, "lat": lat, "lon": lon,
    }


async def _fetch_sentinelhub(lat: float, lon: float, year: int, cache_path: Path) -> dict | None:
    """Fetch from Sentinel Hub API."""
    from sentinelhub import (
        SHConfig, BBox, CRS, SentinelHubRequest,
        DataCollection, MimeType, bbox_to_dimensions,
    )

    config = SHConfig()
    config.sh_client_id = settings.sentinelhub_client_id
    config.sh_client_secret = settings.sentinelhub_client_secret

    delta = 0.05
    bbox = BBox([lon - delta, lat - delta, lon + delta, lat + delta], crs=CRS.WGS84)
    size = bbox_to_dimensions(bbox, resolution=10)

    evalscript = """
    //VERSION=3
    function setup() { return { input: ["B04","B03","B02"], output: { bands: 3 } }; }
    function evaluatePixel(s) { return [3.5*s.B04, 3.5*s.B03, 3.5*s.B02]; }
    """

    request = SentinelHubRequest(
        evalscript=evalscript,
        input_data=[SentinelHubRequest.input_data(
            data_collection=DataCollection.SENTINEL2_L2A,
            time_interval=(f"{year}-06-01", f"{year}-09-30"),
            mosaicking_order="leastCC",
        )],
        responses=[SentinelHubRequest.output_response("default", MimeType.JPG)],
        bbox=bbox, size=size, config=config,
    )

    images = request.get_data()
    if not images:
        return None

    img = Image.fromarray(images[0])
    img.save(str(cache_path), "JPEG", quality=90)

    return {
        "image_url": f"/static/images/{cache_path.name}",
        "source": "sentinel_hub",
        "year": year, "lat": lat, "lon": lon,
    }


async def _fetch_synthetic(lat: float, lon: float, year: int, cache_path: Path) -> dict:
    """Generate a synthetic placeholder image (demo fallback only)."""
    img_array = _generate_synthetic_satellite(lat, lon, year)
    img = Image.fromarray(img_array)
    img.save(str(cache_path), "JPEG", quality=85)
    return {
        "image_url": f"/static/images/{cache_path.name}",
        "source": "synthetic_demo",
        "year": year, "lat": lat, "lon": lon,
    }


def _generate_synthetic_satellite(lat: float, lon: float, year: int) -> np.ndarray:
    """Generate a synthetic satellite-like image for demo purposes."""
    rng = np.random.default_rng(seed=int(abs(lat * 1000 + lon * 100 + year)))
    h, w = 256, 256  # fixed size to avoid shape mismatches

    img = np.zeros((h, w, 3), dtype=np.uint8)
    img[:, :, 0] = rng.integers(40, 80,  (h, w))
    img[:, :, 1] = rng.integers(60, 100, (h, w))
    img[:, :, 2] = rng.integers(20, 50,  (h, w))

    # Urban blocks
    n_blocks = int(20 + (year - 2013) * 3)
    for _ in range(n_blocks):
        x  = int(rng.integers(0, w - 20))
        y  = int(rng.integers(0, h - 20))
        bw = int(rng.integers(5, max(6, min(60, w - x))))
        bh = int(rng.integers(5, max(6, min(50, h - y))))
        gray = int(rng.integers(100, 180))
        img[y:y+bh, x:x+bw] = [gray, gray, gray]

    # Vegetation patches
    for _ in range(15):
        x  = int(rng.integers(0, w - 20))
        y  = int(rng.integers(0, h - 20))
        vw = int(rng.integers(5, max(6, min(80, w - x))))
        vh = int(rng.integers(5, max(6, min(70, h - y))))
        img[y:y+vh, x:x+vw, 0] = rng.integers(20, 50,  (vh, vw))
        img[y:y+vh, x:x+vw, 1] = rng.integers(80, 140, (vh, vw))
        img[y:y+vh, x:x+vw, 2] = rng.integers(20, 50,  (vh, vw))

    return img
