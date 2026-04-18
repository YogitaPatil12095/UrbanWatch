"""
Copernicus Data Space Sentinel-2 Service
Fetches real Sentinel-2 L2A imagery at 10m resolution.
Uses OAuth2 client credentials flow.

API: https://dataspace.copernicus.eu/
"""
import io
import math
import hashlib
import httpx
import numpy as np
from PIL import Image
from pathlib import Path
from app.config import settings

STATIC_DIR = Path("static/images")
TOKEN_URL  = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process"

_token_cache = {"token": None, "expires_at": 0}


async def _get_token() -> str | None:
    """Get OAuth2 access token from Copernicus."""
    import time
    if _token_cache["token"] and time.time() < _token_cache["expires_at"] - 60:
        return _token_cache["token"]

    if not settings.sentinelhub_client_id or not settings.sentinelhub_client_secret:
        return None

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(TOKEN_URL, data={
                "grant_type":    "client_credentials",
                "client_id":     settings.sentinelhub_client_id,
                "client_secret": settings.sentinelhub_client_secret,
            })
            if resp.status_code == 200:
                data = resp.json()
                _token_cache["token"]      = data["access_token"]
                _token_cache["expires_at"] = time.time() + data.get("expires_in", 3600)
                print("[Copernicus] Token obtained successfully")
                return _token_cache["token"]
            else:
                print(f"[Copernicus] Token error: {resp.status_code} {resp.text[:200]}")
                return None
    except Exception as e:
        print(f"[Copernicus] Token exception: {e}")
        return None


def _bbox_from_point(lat: float, lon: float, km: float = 10.0):
    """Create bounding box around a point."""
    delta_lat = km / 111.0
    delta_lon = km / (111.0 * math.cos(math.radians(lat)))
    return [
        round(lon - delta_lon, 6),
        round(lat - delta_lat, 6),
        round(lon + delta_lon, 6),
        round(lat + delta_lat, 6),
    ]


async def fetch_sentinel2_image(lat: float, lon: float, year: int) -> dict | None:
    """
    Fetch real Sentinel-2 L2A true-color image at 10m resolution.
    Uses Copernicus Data Space Processing API.
    Returns image saved to static/images/ and metadata.
    """
    token = await _get_token()
    if not token:
        return None

    cache_key = hashlib.md5(f"s2_{lat:.4f}_{lon:.4f}_{year}".encode()).hexdigest()
    cache_path = STATIC_DIR / f"sat_{cache_key}.jpg"

    if cache_path.exists():
        return {
            "image_url": f"/static/images/sat_{cache_key}.jpg",
            "source":    "copernicus_sentinel2",
            "year":      year,
            "lat":       lat,
            "lon":       lon,
            "resolution": "10m",
        }

    bbox = _bbox_from_point(lat, lon, km=10)

    # Evalscript: Sentinel-2 true color (B04=Red, B03=Green, B02=Blue)
    evalscript = """
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02", "B03", "B04", "SCL"] }],
    output: { bands: 3, sampleType: "UINT8" }
  };
}
function evaluatePixel(sample) {
  // Cloud masking: SCL 3=cloud shadow, 8=cloud medium, 9=cloud high
  if ([3, 8, 9].includes(sample.SCL)) return [128, 128, 128];
  return [
    Math.min(255, sample.B04 * 3.5 * 255),
    Math.min(255, sample.B03 * 3.5 * 255),
    Math.min(255, sample.B02 * 3.5 * 255)
  ];
}
"""

    # Use summer months for best cloud-free imagery
    payload = {
        "input": {
            "bounds": {
                "bbox": bbox,
                "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"}
            },
            "data": [{
                "type": "sentinel-2-l2a",
                "dataFilter": {
                    "timeRange": {
                        "from": f"{year}-05-01T00:00:00Z",
                        "to":   f"{year}-09-30T23:59:59Z",
                    },
                    "mosaickingOrder": "leastCC",
                    "maxCloudCoverage": 30,
                }
            }]
        },
        "output": {
            "width":  512,
            "height": 512,
            "responses": [{"identifier": "default", "format": {"type": "image/jpeg"}}]
        },
        "evalscript": evalscript,
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                PROCESS_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type":  "application/json",
                    "Accept":        "image/jpeg",
                }
            )

            if resp.status_code == 200 and len(resp.content) > 5000:
                cache_path.write_bytes(resp.content)
                print(f"[Copernicus] Sentinel-2 image fetched: {len(resp.content)} bytes for {year}")
                return {
                    "image_url":  f"/static/images/sat_{cache_key}.jpg",
                    "source":     "copernicus_sentinel2_10m",
                    "year":       year,
                    "lat":        lat,
                    "lon":        lon,
                    "resolution": "10m",
                    "bbox":       bbox,
                }
            else:
                print(f"[Copernicus] Image fetch failed: {resp.status_code} {resp.text[:200]}")
                return None

    except Exception as e:
        print(f"[Copernicus] Image exception: {e}")
        return None


async def compute_ndvi_sentinel2(lat: float, lon: float, year: int) -> dict | None:
    """
    Compute real NDVI from Sentinel-2 NIR (B08) and Red (B04) bands.
    NDVI = (B08 - B04) / (B08 + B04)
    This is the TRUE NDVI formula — not an RGB approximation.
    """
    token = await _get_token()
    if not token:
        return None

    bbox = _bbox_from_point(lat, lon, km=10)

    # Evalscript: compute NDVI, return as uint8 scaled 0-255 (easier to parse)
    # NDVI range [-1,1] mapped to [0,255]: pixel_value = (ndvi + 1) * 127.5
    evalscript = """
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL"] }],
    output: { bands: 1, sampleType: "UINT8" }
  };
}
function evaluatePixel(sample) {
  // Cloud masking
  if ([3, 8, 9].includes(sample.SCL)) return [128]; // 128 = NDVI 0 (no data)
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04 + 0.0001);
  // Scale to 0-255: ndvi=-1 → 0, ndvi=0 → 127, ndvi=1 → 255
  let scaled = Math.round((ndvi + 1.0) * 127.5);
  return [Math.max(0, Math.min(255, scaled))];
}
"""

    payload = {
        "input": {
            "bounds": {
                "bbox": bbox,
                "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"}
            },
            "data": [{
                "type": "sentinel-2-l2a",
                "dataFilter": {
                    "timeRange": {
                        "from": f"{year}-05-01T00:00:00Z",
                        "to":   f"{year}-09-30T23:59:59Z",
                    },
                    "mosaickingOrder": "leastCC",
                    "maxCloudCoverage": 30,
                }
            }]
        },
        "output": {
            "width":  256,
            "height": 256,
            "responses": [{"identifier": "default", "format": {"type": "image/png"}}]
        },
        "evalscript": evalscript,
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                PROCESS_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type":  "application/json",
                    "Accept":        "image/png",
                }
            )

            if resp.status_code == 200 and len(resp.content) > 1000:
                try:
                    img = Image.open(io.BytesIO(resp.content)).convert("L")
                    arr = np.array(img, dtype=np.float32)

                    # Exclude cloud-masked pixels (value = 128 ± 2)
                    valid_mask = (arr < 126) | (arr > 130)
                    valid = arr[valid_mask]

                    if len(valid) > 100:
                        # Convert back to NDVI: ndvi = (pixel/127.5) - 1
                        ndvi_values = (valid / 127.5) - 1.0
                        mean_ndvi = float(np.median(ndvi_values))
                        print(f"[Copernicus] True NDVI {year}: {mean_ndvi:.4f} ({len(valid)} valid pixels)")
                        return {
                            "ndvi":   round(mean_ndvi, 4),
                            "year":   year,
                            "source": "Sentinel-2 L2A B08/B04 (true NDVI)",
                            "pixels": len(valid),
                            "real":   True,
                        }
                    else:
                        print(f"[Copernicus] NDVI: insufficient valid pixels ({len(valid)})")
                except Exception as parse_err:
                    print(f"[Copernicus] Parse error: {parse_err}")
            print(f"[Copernicus] NDVI fetch failed: {resp.status_code} {resp.text[:100]}")
            return None

    except Exception as e:
        print(f"[Copernicus] NDVI exception: {e}")
        return None
