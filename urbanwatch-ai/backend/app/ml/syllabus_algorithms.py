"""
Syllabus-aligned ML algorithms applied to real satellite data.

1. K-Means Clustering (Partition-based clustering)
   - Classifies satellite image pixels into land cover groups
   - Input: real NASA GIBS MODIS RGB pixels
   - Output: cluster labels + class percentages

2. Linear Regression (Regression)
   - Predicts NDVI trend over time using real NASA NDVI values
   - Input: year → NDVI data points from NASA MODIS
   - Output: slope (trend), R², prediction

3. Anomaly Detection (Statistical)
   - Detects pixels with statistically unusual change
   - Input: before/after satellite images
   - Output: anomaly score, flagged regions
"""
import numpy as np
from PIL import Image


# ── 1. K-Means Clustering ─────────────────────────────────────────────────────

def kmeans_clustering(img: np.ndarray, k: int = 4) -> dict:
    """
    Partition-based K-Means clustering on satellite image pixels.
    Classifies each pixel into one of k land cover classes.

    Algorithm (from syllabus — Partition-based clustering):
    1. Initialize k centroids randomly
    2. Assign each pixel to nearest centroid (Euclidean distance)
    3. Recompute centroids as mean of assigned pixels
    4. Repeat until convergence

    Input: RGB image array (H, W, 3)
    Output: cluster labels, class percentages, centroid colors
    """
    h, w = img.shape[:2]
    pixels = img.reshape(-1, 3).astype(np.float32) / 255.0

    # Initialize centroids using k-means++ style
    rng = np.random.default_rng(42)
    idx = rng.choice(len(pixels), k, replace=False)
    centroids = pixels[idx].copy()

    labels = np.zeros(len(pixels), dtype=np.int32)

    for iteration in range(100):
        # Assignment step: Euclidean distance to each centroid
        dists = np.linalg.norm(
            pixels[:, np.newaxis, :] - centroids[np.newaxis, :, :],
            axis=2
        )
        new_labels = np.argmin(dists, axis=1)

        if np.all(new_labels == labels):
            break
        labels = new_labels

        # Update step: recompute centroids
        for i in range(k):
            mask = labels == i
            if mask.sum() > 0:
                centroids[i] = pixels[mask].mean(axis=0)

    label_map = labels.reshape(h, w)

    # Classify clusters by spectral signature
    class_names = _classify_clusters(centroids)
    class_pcts = {
        class_names[i]: round(float((labels == i).mean() * 100), 2)
        for i in range(k)
    }

    # Build colored segmentation map
    colors = [
        [34, 197, 94],    # green — vegetation
        [156, 163, 175],  # gray — urban/built-up
        [59, 130, 246],   # blue — water
        [217, 119, 6],    # amber — bare soil
    ]
    seg = np.zeros((h, w, 3), dtype=np.uint8)
    for i in range(k):
        seg[label_map == i] = colors[i % len(colors)]

    return {
        "algorithm": "K-Means Clustering (Partition-based)",
        "k": k,
        "iterations": iteration + 1,
        "class_percentages": class_pcts,
        "seg_map": seg,
        "centroids_rgb": (centroids * 255).astype(int).tolist(),
    }


def _classify_clusters(centroids: np.ndarray) -> list:
    names = []
    for c in centroids:
        r, g, b = c
        if b > 0.35 and b > r:
            names.append("Water")
        elif g > r and g > b and g > 0.2:
            names.append("Vegetation")
        elif r > 0.45 and g > 0.35 and b < 0.25:
            names.append("Bare Soil")
        else:
            names.append("Urban/Built-up")
    return names


# ── 2. Linear Regression ──────────────────────────────────────────────────────

def linear_regression_ndvi(ndvi_data: dict) -> dict:
    """
    Simple Linear Regression on NDVI time series.
    Fits y = mx + b where x = year, y = NDVI value.

    Algorithm (from syllabus — Simple Linear Regression):
    - Minimize sum of squared residuals
    - Compute slope m = Σ(xi-x̄)(yi-ȳ) / Σ(xi-x̄)²
    - Compute intercept b = ȳ - m*x̄
    - Compute R² = 1 - SS_res/SS_tot

    Input: {year: ndvi_value} dict from real NASA data
    Output: slope, intercept, R², trend direction, prediction
    """
    if len(ndvi_data) < 2:
        return {"error": "Need at least 2 data points", "algorithm": "Linear Regression"}

    years = np.array(sorted(ndvi_data.keys()), dtype=float)
    ndvis = np.array([ndvi_data[int(y)] for y in years], dtype=float)

    # Compute means
    x_mean = years.mean()
    y_mean = ndvis.mean()

    # Compute slope and intercept
    numerator   = np.sum((years - x_mean) * (ndvis - y_mean))
    denominator = np.sum((years - x_mean) ** 2)

    if denominator == 0:
        return {"error": "Cannot compute regression", "algorithm": "Linear Regression"}

    slope     = float(numerator / denominator)
    intercept = float(y_mean - slope * x_mean)

    # Compute R²
    y_pred   = slope * years + intercept
    ss_res   = float(np.sum((ndvis - y_pred) ** 2))
    ss_tot   = float(np.sum((ndvis - y_mean) ** 2))
    r_squared = round(1 - ss_res / ss_tot, 4) if ss_tot > 0 else 0.0

    # Trend interpretation
    if slope < -0.005:
        trend = "Declining vegetation"
    elif slope > 0.005:
        trend = "Improving vegetation"
    else:
        trend = "Stable vegetation"

    # Predict next year
    next_year = int(max(years)) + 1
    prediction = round(float(slope * next_year + intercept), 4)

    return {
        "algorithm": "Linear Regression (Simple)",
        "slope":     round(slope, 6),
        "intercept": round(intercept, 4),
        "r_squared": r_squared,
        "trend":     trend,
        "trend_per_year": round(slope * 100, 3),  # % change per year
        "prediction_next_year": {
            "year":  next_year,
            "ndvi":  prediction,
        },
        "data_points": len(years),
        "years": years.tolist(),
        "ndvi_values": ndvis.tolist(),
    }


# ── 3. Anomaly Detection ──────────────────────────────────────────────────────

def anomaly_detection(img_before: np.ndarray, img_after: np.ndarray,
                      threshold_sigma: float = 2.0) -> dict:
    """
    Statistical Anomaly Detection on satellite image change.
    Flags pixels where change exceeds threshold standard deviations.

    Algorithm (from syllabus — Anomaly Detection):
    1. Compute per-pixel difference between before/after images
    2. Calculate mean (μ) and std (σ) of difference distribution
    3. Flag pixels where |diff| > μ + threshold × σ
    4. Classify anomaly direction (increase vs decrease)

    Input: two RGB image arrays of same size
    Output: anomaly mask, anomaly %, flagged regions
    """
    # Resize to same dimensions
    h = min(img_before.shape[0], img_after.shape[0])
    w = min(img_before.shape[1], img_after.shape[1])

    before = np.array(Image.fromarray(img_before).resize((w, h))).astype(np.float32)
    after  = np.array(Image.fromarray(img_after).resize((w, h))).astype(np.float32)

    # Compute luminance difference
    lum_before = 0.299*before[:,:,0] + 0.587*before[:,:,1] + 0.114*before[:,:,2]
    lum_after  = 0.299*after[:,:,0]  + 0.587*after[:,:,1]  + 0.114*after[:,:,2]
    diff = lum_after - lum_before

    # Statistical thresholding
    mu    = float(diff.mean())
    sigma = float(diff.std()) + 1e-8

    upper_thresh = mu + threshold_sigma * sigma
    lower_thresh = mu - threshold_sigma * sigma

    anomaly_mask    = (diff > upper_thresh) | (diff < lower_thresh)
    increase_mask   = diff > upper_thresh   # brighter = urban/built-up
    decrease_mask   = diff < lower_thresh   # darker = vegetation loss

    anomaly_pct  = round(float(anomaly_mask.mean() * 100), 2)
    increase_pct = round(float(increase_mask.mean() * 100), 2)
    decrease_pct = round(float(decrease_mask.mean() * 100), 2)

    # Build colored anomaly map
    amap = np.zeros((h, w, 3), dtype=np.uint8)
    amap[increase_mask] = [255, 107, 107]   # coral — increase (urban)
    amap[decrease_mask] = [100, 255, 218]   # teal — decrease (vegetation loss)

    return {
        "algorithm":     "Statistical Anomaly Detection",
        "threshold":     f"μ ± {threshold_sigma}σ",
        "mean_diff":     round(mu, 4),
        "std_diff":      round(sigma, 4),
        "anomaly_pct":   anomaly_pct,
        "increase_pct":  increase_pct,
        "decrease_pct":  decrease_pct,
        "anomaly_map":   amap,
        "interpretation": (
            "High anomaly — significant land use change detected"
            if anomaly_pct > 15 else
            "Moderate anomaly — some change detected"
            if anomaly_pct > 5 else
            "Low anomaly — area relatively stable"
        ),
    }
