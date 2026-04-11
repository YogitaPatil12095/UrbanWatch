"""
Spectral Indices & Advanced ML Analysis
- NDVI: Normalized Difference Vegetation Index
- NDBI: Normalized Difference Built-up Index
- MNDWI: Modified Normalized Difference Water Index
- K-Means land cover clustering
- Z-score anomaly detection
- PCA Change Vector Analysis
- Edge detection for infrastructure mapping
"""
import numpy as np
from PIL import Image
from pathlib import Path

STATIC_DIR = Path("static/images")


# ── Spectral Indices ──────────────────────────────────────────────────────────

def compute_ndvi(img: np.ndarray) -> np.ndarray:
    """
    NDVI = (NIR - Red) / (NIR + Red)
    Since we only have RGB, we approximate NIR ≈ Green channel
    (common for RGB-only satellite data).
    Returns float array in [-1, 1].
    """
    r = img[:, :, 0].astype(np.float32)
    g = img[:, :, 1].astype(np.float32)  # NIR proxy
    denom = g + r
    ndvi = np.where(denom > 0, (g - r) / denom, 0.0)
    return np.clip(ndvi, -1, 1)


def compute_ndbi(img: np.ndarray) -> np.ndarray:
    """
    NDBI = (SWIR - NIR) / (SWIR + NIR)
    Approximated with RGB: SWIR ≈ Red, NIR ≈ Green
    High NDBI = built-up/urban areas.
    """
    r = img[:, :, 0].astype(np.float32)
    g = img[:, :, 1].astype(np.float32)
    denom = r + g
    ndbi = np.where(denom > 0, (r - g) / denom, 0.0)
    return np.clip(ndbi, -1, 1)


def compute_mndwi(img: np.ndarray) -> np.ndarray:
    """
    MNDWI = (Green - SWIR) / (Green + SWIR)
    Approximated: SWIR ≈ Red channel
    High MNDWI = water bodies.
    """
    r = img[:, :, 0].astype(np.float32)
    g = img[:, :, 1].astype(np.float32)
    b = img[:, :, 2].astype(np.float32)
    # Use blue as water proxy
    denom = g + b
    mndwi = np.where(denom > 0, (g - b) / denom, 0.0)
    return np.clip(mndwi, -1, 1)


def index_to_colormap(index: np.ndarray, colormap: str = "ndvi") -> np.ndarray:
    """Convert a [-1,1] index array to an RGB colormap image."""
    norm = (index + 1) / 2.0  # → [0, 1]

    if colormap == "ndvi":
        # Brown (low) → Yellow → Green (high)
        r = np.clip(1.0 - norm * 0.8, 0, 1)
        g = np.clip(norm, 0, 1)
        b = np.clip(0.2 - norm * 0.2, 0, 1)
    elif colormap == "ndbi":
        # Blue (low) → White → Red (high)
        r = np.clip(norm * 2, 0, 1)
        g = np.clip(1 - np.abs(norm - 0.5) * 2, 0, 1)
        b = np.clip(2 - norm * 2, 0, 1)
    elif colormap == "mndwi":
        # Brown → Cyan → Blue
        r = np.clip(1 - norm, 0, 1)
        g = np.clip(norm * 0.8, 0, 1)
        b = np.clip(norm, 0, 1)
    else:
        r = g = b = norm

    rgb = (np.stack([r, g, b], axis=2) * 255).astype(np.uint8)
    return rgb


# ── K-Means Land Cover Clustering ────────────────────────────────────────────

def kmeans_land_cover(img: np.ndarray, n_clusters: int = 5) -> dict:
    """
    Unsupervised K-Means clustering to classify land cover types.
    Returns cluster labels and class statistics.
    """
    h, w = img.shape[:2]
    pixels = img.reshape(-1, 3).astype(np.float32) / 255.0

    # Simple K-Means (pure numpy, no sklearn needed)
    labels, centers = _numpy_kmeans(pixels, n_clusters, max_iter=50)
    label_map = labels.reshape(h, w)

    # Classify each cluster by its spectral signature
    class_names = _classify_clusters(centers)

    # Build colored segmentation map
    colors = [
        [34, 139, 34],    # Forest green
        [139, 90, 43],    # Bare soil brown
        [128, 128, 128],  # Urban gray
        [64, 164, 223],   # Water blue
        [210, 180, 140],  # Cropland tan
    ]
    seg_map = np.zeros((h, w, 3), dtype=np.uint8)
    for i in range(n_clusters):
        seg_map[label_map == i] = colors[i % len(colors)]

    # Compute class percentages
    class_pcts = {}
    for i, name in enumerate(class_names):
        pct = float((label_map == i).sum() / label_map.size * 100)
        class_pcts[name] = round(pct, 2)

    return {
        "label_map": label_map,
        "seg_map": seg_map,
        "class_percentages": class_pcts,
        "n_clusters": n_clusters,
    }


def _numpy_kmeans(pixels: np.ndarray, k: int, max_iter: int = 50):
    """Pure numpy K-Means implementation."""
    rng = np.random.default_rng(42)
    # Initialize centers with k-means++ style (random subset)
    idx = rng.choice(len(pixels), k, replace=False)
    centers = pixels[idx].copy()

    labels = np.zeros(len(pixels), dtype=np.int32)
    for _ in range(max_iter):
        # Assign step: find nearest center for each pixel
        dists = np.linalg.norm(pixels[:, None, :] - centers[None, :, :], axis=2)
        new_labels = np.argmin(dists, axis=1)

        if np.all(new_labels == labels):
            break
        labels = new_labels

        # Update step: recompute centers
        for i in range(k):
            mask = labels == i
            if mask.sum() > 0:
                centers[i] = pixels[mask].mean(axis=0)

    return labels, centers


def _classify_clusters(centers: np.ndarray) -> list:
    """Assign semantic names to clusters based on RGB signature."""
    names = []
    for c in centers:
        r, g, b = c
        if b > 0.4 and b > r and b > g:
            names.append("Water")
        elif g > r and g > b and g > 0.25:
            names.append("Vegetation")
        elif r > 0.5 and g > 0.4 and b > 0.4:
            names.append("Urban/Built-up")
        elif r > 0.4 and g > 0.3 and b < 0.25:
            names.append("Bare Soil")
        else:
            names.append("Mixed/Other")
    return names


# ── Z-Score Anomaly Detection ─────────────────────────────────────────────────

def zscore_anomaly_detection(img_before: np.ndarray, img_after: np.ndarray,
                              threshold: float = 2.5) -> dict:
    """
    Detect anomalous changes using Z-score on per-channel differences.
    Pixels beyond `threshold` standard deviations are flagged as anomalies.
    """
    b = img_before.astype(np.float32)
    a = img_after.astype(np.float32)
    diff = a - b  # signed difference

    # Z-score per channel
    mean = diff.mean(axis=(0, 1))
    std  = diff.std(axis=(0, 1)) + 1e-8
    z    = np.abs((diff - mean) / std)

    # Anomaly = any channel exceeds threshold
    anomaly_mask = (z > threshold).any(axis=2)

    # Classify anomaly direction
    increase_mask = anomaly_mask & (diff.mean(axis=2) > 0)  # brighter = urban
    decrease_mask = anomaly_mask & (diff.mean(axis=2) < 0)  # darker = veg loss

    anomaly_map = np.zeros((*anomaly_mask.shape, 3), dtype=np.uint8)
    anomaly_map[increase_mask] = [255, 80, 0]    # Orange: urban increase
    anomaly_map[decrease_mask] = [0, 200, 80]    # Green: vegetation decrease

    return {
        "anomaly_mask": anomaly_mask.astype(np.uint8) * 255,
        "anomaly_map": anomaly_map,
        "anomaly_pct": float(anomaly_mask.mean() * 100),
        "increase_pct": float(increase_mask.mean() * 100),
        "decrease_pct": float(decrease_mask.mean() * 100),
        "threshold": threshold,
    }


# ── PCA Change Vector Analysis ────────────────────────────────────────────────

def pca_change_vector_analysis(img_before: np.ndarray,
                                img_after: np.ndarray) -> dict:
    """
    PCA-based Change Vector Analysis (CVA).
    Projects the change vector into principal components.
    PC1 captures the dominant change direction.
    """
    h, w = img_before.shape[:2]
    b = img_before.astype(np.float32).reshape(-1, 3) / 255.0
    a = img_after.astype(np.float32).reshape(-1, 3) / 255.0

    diff = a - b  # change vectors (N, 3)

    # Center
    mean = diff.mean(axis=0)
    centered = diff - mean

    # Covariance matrix and eigen decomposition
    cov = np.cov(centered.T)
    eigenvalues, eigenvectors = np.linalg.eigh(cov)

    # Sort by descending eigenvalue
    order = np.argsort(eigenvalues)[::-1]
    eigenvalues = eigenvalues[order]
    eigenvectors = eigenvectors[:, order]

    # Project onto PC1 (dominant change direction)
    pc1 = centered @ eigenvectors[:, 0]
    pc1_map = pc1.reshape(h, w)

    # Normalize to [0, 255]
    pc1_norm = pc1_map - pc1_map.min()
    if pc1_norm.max() > 0:
        pc1_norm = (pc1_norm / pc1_norm.max() * 255).astype(np.uint8)
    else:
        pc1_norm = pc1_norm.astype(np.uint8)

    # Variance explained
    total_var = eigenvalues.sum()
    variance_explained = (eigenvalues / total_var * 100).tolist() if total_var > 0 else [0, 0, 0]

    # Change magnitude
    magnitude = np.linalg.norm(diff, axis=1).reshape(h, w)
    mag_thresh = magnitude.mean() + magnitude.std()
    change_mask = (magnitude > mag_thresh).astype(np.uint8) * 255

    return {
        "pc1_map": pc1_norm,
        "change_mask": change_mask,
        "variance_explained": [round(v, 1) for v in variance_explained],
        "change_pct": float((change_mask > 0).mean() * 100),
        "mean_magnitude": float(magnitude.mean()),
    }


# ── Edge Detection for Infrastructure ────────────────────────────────────────

def detect_infrastructure_edges(img: np.ndarray) -> dict:
    """
    Sobel edge detection to map roads, buildings, and infrastructure boundaries.
    Falls back to numpy gradient if OpenCV unavailable.
    """
    try:
        import cv2
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY).astype(np.float32)
        sobel_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        magnitude = np.sqrt(sobel_x**2 + sobel_y**2)
        edges = cv2.Canny(img, 50, 150)
    except ImportError:
        # Pure numpy Sobel approximation
        gray = (0.299*img[:,:,0] + 0.587*img[:,:,1] + 0.114*img[:,:,2]).astype(np.float32)
        gy, gx = np.gradient(gray)
        magnitude = np.sqrt(gx**2 + gy**2)
        thresh = magnitude.mean() + magnitude.std()
        edges = (magnitude > thresh).astype(np.uint8) * 255

    # Normalize magnitude
    if magnitude.max() > 0:
        mag_norm = (magnitude / magnitude.max() * 255).astype(np.uint8)
    else:
        mag_norm = magnitude.astype(np.uint8)

    # Color edges: cyan overlay
    edge_colored = np.zeros((*edges.shape, 3), dtype=np.uint8)
    edge_colored[edges > 0] = [0, 212, 255]

    infra_density = float((edges > 0).mean() * 100)

    return {
        "edge_map": edges,
        "edge_colored": edge_colored,
        "magnitude": mag_norm,
        "infrastructure_density_pct": round(infra_density, 2),
    }


# ── Save helpers ──────────────────────────────────────────────────────────────

def save_index_image(arr: np.ndarray, name: str) -> str:
    """Save an RGB array as PNG and return its URL."""
    path = STATIC_DIR / f"{name}.png"
    Image.fromarray(arr).save(str(path))
    return f"/static/images/{name}.png"
