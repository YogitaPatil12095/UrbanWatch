"""
Full analysis endpoint — runs all ML techniques in one call.
"""
import hashlib
import traceback
import numpy as np
from PIL import Image
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.satellite_service import fetch_satellite_image
from app.ml.change_detection import (
    load_image_as_array, basic_change_detection,
    advanced_change_detection, save_change_map,
)
from app.ml.indices import (
    compute_ndvi, compute_ndbi, compute_mndwi,
    index_to_colormap, kmeans_land_cover,
    zscore_anomaly_detection, pca_change_vector_analysis,
    detect_infrastructure_edges, save_index_image,
)

router = APIRouter()


class AnalyzeRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    year_from: int = Field(..., ge=2013, le=2023)
    year_to: int = Field(..., ge=2014, le=2024)
    mode: str = Field("basic", pattern="^(basic|advanced)$")


@router.post("/analyze")
async def full_analysis(req: AnalyzeRequest):
    """
    Runs the complete ML pipeline:
    1. Fetch satellite images
    2. Basic / Advanced change detection
    3. Spectral indices (NDVI, NDBI, MNDWI)
    4. K-Means land cover classification
    5. Z-Score anomaly detection
    6. PCA Change Vector Analysis
    7. Edge detection (infrastructure)
    """
    if req.year_from >= req.year_to:
        raise HTTPException(400, "year_from must be less than year_to")

    try:
        key = hashlib.md5(
            f"{req.lat:.4f}_{req.lon:.4f}_{req.year_from}_{req.year_to}_{req.mode}".encode()
        ).hexdigest()

        # 1. Fetch images
        meta_from = await fetch_satellite_image(req.lat, req.lon, req.year_from)
        meta_to   = await fetch_satellite_image(req.lat, req.lon, req.year_to)
        img_before = load_image_as_array(meta_from["image_url"])
        img_after  = load_image_as_array(meta_to["image_url"])

        # Normalize both images to same size for all ML ops
        TARGET_H, TARGET_W = 256, 256
        img_before = np.array(Image.fromarray(img_before).resize((TARGET_W, TARGET_H)))
        img_after  = np.array(Image.fromarray(img_after).resize((TARGET_W, TARGET_H)))

        # 2. Change detection
        if req.mode == "advanced":
            cd_result = advanced_change_detection(img_before, img_after)
        else:
            cd_result = basic_change_detection(img_before, img_after)
        change_map_url = save_change_map(cd_result, key)

        # 3. Spectral indices on AFTER image
        ndvi  = compute_ndvi(img_after)
        ndbi  = compute_ndbi(img_after)
        mndwi = compute_mndwi(img_after)

        ndvi_img  = save_index_image(index_to_colormap(ndvi,  "ndvi"),  f"ndvi_{key}")
        ndbi_img  = save_index_image(index_to_colormap(ndbi,  "ndbi"),  f"ndbi_{key}")
        mndwi_img = save_index_image(index_to_colormap(mndwi, "mndwi"), f"mndwi_{key}")

        # NDVI delta (before vs after)
        ndvi_before = compute_ndvi(img_before)
        ndbi_before = compute_ndbi(img_before)
        ndvi_delta  = float((ndvi - ndvi_before).mean())

        # Derive urban_pct and vegetation_pct from spectral indices
        # (used when basic mode doesn't compute them directly)
        if cd_result.get("urban_pct", 0) == 0 and cd_result.get("vegetation_pct", 0) == 0:
            ndbi_before = compute_ndbi(img_before)
            ndbi_delta  = ndbi - ndbi_before
            ndvi_loss   = ndvi_before - ndvi  # positive = vegetation lost

            # Urban: NDBI increased AND NDVI decreased (built-up replacing green)
            urban_mask = (ndbi_delta > 0.03) & (ndvi_loss > 0.01)
            urban_pct  = float(urban_mask.mean() * 100)

            # Vegetation loss: NDVI dropped significantly but NOT classified as urban
            veg_mask   = (ndvi_loss > 0.01) & ~urban_mask
            veg_pct    = float(veg_mask.mean() * 100)

            cd_result["urban_pct"]      = round(urban_pct, 2)
            cd_result["vegetation_pct"] = round(veg_pct, 2)

        # 4. K-Means land cover
        km_before = kmeans_land_cover(img_before, n_clusters=5)
        km_after  = kmeans_land_cover(img_after,  n_clusters=5)
        km_before_url = save_index_image(km_before["seg_map"], f"km_before_{key}")
        km_after_url  = save_index_image(km_after["seg_map"],  f"km_after_{key}")

        # 5. Z-Score anomaly detection
        anomaly = zscore_anomaly_detection(img_before, img_after, threshold=2.5)
        anomaly_url = save_index_image(anomaly["anomaly_map"], f"anomaly_{key}")

        # 6. PCA Change Vector Analysis
        pca = pca_change_vector_analysis(img_before, img_after)
        pca_url = save_index_image(
            index_to_colormap(pca["pc1_map"].astype(np.float32) / 127.5 - 1, "ndvi"),
            f"pca_{key}"
        ) if False else save_index_image(
            _gray_to_rgb(pca["pc1_map"]), f"pca_{key}"
        )

        # 7. Edge detection
        edges_before = detect_infrastructure_edges(img_before)
        edges_after  = detect_infrastructure_edges(img_after)
        edge_url = save_index_image(edges_after["edge_colored"], f"edges_{key}")

        # Compute risk score (0–100)
        risk_score = _compute_risk_score(
            urban_pct=cd_result.get("urban_pct", cd_result["change_pct"]),
            veg_loss=float((ndvi_before - ndvi).clip(0).mean() * 100),
            anomaly_pct=anomaly["anomaly_pct"],
            infra_density=edges_after["infrastructure_density_pct"],
        )

        return {
            # Images
            "image_from_url": meta_from["image_url"],
            "image_to_url":   meta_to["image_url"],
            "change_map_url": change_map_url,
            "ndvi_url":       ndvi_img,
            "ndbi_url":       ndbi_img,
            "mndwi_url":      mndwi_img,
            "km_before_url":  km_before_url,
            "km_after_url":   km_after_url,
            "anomaly_url":    anomaly_url,
            "pca_url":        pca_url,
            "edge_url":       edge_url,

            # Change detection stats
            "change_pct":      round(cd_result["change_pct"], 2),
            "urban_pct":       round(cd_result.get("urban_pct", 0), 2),
            "vegetation_pct":  round(cd_result.get("vegetation_pct", 0), 2),
            "detection_mode":  cd_result.get("mode", req.mode),

            # Spectral indices
            "ndvi_mean_after":  round(float(ndvi.mean()), 4),
            "ndbi_mean_after":  round(float(ndbi.mean()), 4),
            "mndwi_mean_after": round(float(mndwi.mean()), 4),
            "ndvi_delta":       round(ndvi_delta, 4),

            # Land cover
            "land_cover_before": km_before["class_percentages"],
            "land_cover_after":  km_after["class_percentages"],

            # Anomaly
            "anomaly_pct":   round(anomaly["anomaly_pct"], 2),
            "increase_pct":  round(anomaly["increase_pct"], 2),
            "decrease_pct":  round(anomaly["decrease_pct"], 2),

            # PCA
            "pca_variance_explained": pca["variance_explained"],
            "pca_change_pct":         round(pca["change_pct"], 2),

            # Infrastructure
            "infra_density_before": edges_before["infrastructure_density_pct"],
            "infra_density_after":  edges_after["infrastructure_density_pct"],
            "infra_growth_pct": round(
                edges_after["infrastructure_density_pct"] -
                edges_before["infrastructure_density_pct"], 2
            ),

            # Risk
            "risk_score": risk_score,
            "risk_level": _risk_level(risk_score),
        }

    except Exception as e:
        print(f"[analyze] ERROR: {traceback.format_exc()}")
        raise HTTPException(500, str(e))


def _gray_to_rgb(arr: np.ndarray) -> np.ndarray:
    return np.stack([arr, arr, arr], axis=2)


def _compute_risk_score(urban_pct, veg_loss, anomaly_pct, infra_density) -> int:
    """Weighted risk score 0–100."""
    score = (
        urban_pct    * 0.35 +
        veg_loss     * 0.30 +
        anomaly_pct  * 0.25 +
        infra_density * 0.10
    )
    return min(int(score), 100)


def _risk_level(score: int) -> str:
    if score < 20:  return "Low"
    if score < 45:  return "Moderate"
    if score < 70:  return "High"
    return "Critical"
