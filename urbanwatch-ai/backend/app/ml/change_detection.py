"""
Change Detection Engine
- Basic mode: grayscale differencing + threshold (uses opencv if available, else pure numpy)
- Advanced mode: U-Net segmentation (PyTorch, optional)
"""
import numpy as np
from PIL import Image
from pathlib import Path
import hashlib

# OpenCV is optional — fall back to numpy-only processing
try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False
    print("[ML] opencv not available, using numpy fallback")

STATIC_DIR = Path("static/images")


def load_image_as_array(image_path: str) -> np.ndarray:
    """Load image from file path or URL into numpy array."""
    path = Path("." + image_path) if image_path.startswith("/static") else Path(image_path)
    img = Image.open(path).convert("RGB")
    return np.array(img)


def basic_change_detection(img_before: np.ndarray, img_after: np.ndarray) -> dict:
    """
    Basic change detection via grayscale differencing.
    Returns change mask and statistics.
    """
    h = min(img_before.shape[0], img_after.shape[0])
    w = min(img_before.shape[1], img_after.shape[1])

    if HAS_CV2:
        before = cv2.resize(img_before, (w, h))
        after  = cv2.resize(img_after,  (w, h))
        gray_before = cv2.cvtColor(before, cv2.COLOR_RGB2GRAY).astype(np.float32)
        gray_after  = cv2.cvtColor(after,  cv2.COLOR_RGB2GRAY).astype(np.float32)
    else:
        # numpy resize via PIL
        before = np.array(Image.fromarray(img_before).resize((w, h)))
        after  = np.array(Image.fromarray(img_after).resize((w, h)))
        # luminance weights
        gray_before = (0.299*before[:,:,0] + 0.587*before[:,:,1] + 0.114*before[:,:,2]).astype(np.float32)
        gray_after  = (0.299*after[:,:,0]  + 0.587*after[:,:,1]  + 0.114*after[:,:,2]).astype(np.float32)

    diff = np.abs(gray_after - gray_before)
    diff_norm = (diff / diff.max() * 255).astype(np.uint8) if diff.max() > 0 else diff.astype(np.uint8)

    if HAS_CV2:
        _, binary_mask = cv2.threshold(diff_norm, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel)
        binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN,  kernel)
    else:
        # Simple threshold at mean + 1 std
        thresh = diff_norm.mean() + diff_norm.std()
        binary_mask = (diff_norm > thresh).astype(np.uint8) * 255

    change_pct = float((binary_mask > 0).sum() / binary_mask.size * 100)
    return {"diff": diff_norm, "mask": binary_mask, "change_pct": change_pct}


def advanced_change_detection(img_before: np.ndarray, img_after: np.ndarray) -> dict:
    """
    Advanced change detection using a lightweight CNN.
    Falls back to enhanced basic detection if PyTorch unavailable.
    """
    try:
        import torch
        import torch.nn as nn
        import torchvision.transforms as T

        model = _get_unet_model()
        result = _run_unet(model, img_before, img_after)
        return result
    except ImportError:
        print("[ML] PyTorch not available, using enhanced basic detection")
        return _enhanced_basic_detection(img_before, img_after)
    except Exception as e:
        import traceback
        print(f"[ML] Advanced detection failed: {traceback.format_exc()}")
        return _enhanced_basic_detection(img_before, img_after)


def _enhanced_basic_detection(img_before: np.ndarray, img_after: np.ndarray) -> dict:
    """Enhanced basic detection with multi-channel analysis."""
    h = min(img_before.shape[0], img_after.shape[0])
    w = min(img_before.shape[1], img_after.shape[1])

    if HAS_CV2:
        before = cv2.resize(img_before, (w, h)).astype(np.float32)
        after  = cv2.resize(img_after,  (w, h)).astype(np.float32)
    else:
        before = np.array(Image.fromarray(img_before).resize((w, h))).astype(np.float32)
        after  = np.array(Image.fromarray(img_after).resize((w, h))).astype(np.float32)

    diff = np.abs(after - before)
    diff_mean = diff.mean(axis=2)
    diff_norm = (diff_mean / diff_mean.max() * 255).astype(np.uint8) if diff_mean.max() > 0 else diff_mean.astype(np.uint8)

    if HAS_CV2:
        binary = cv2.adaptiveThreshold(diff_norm, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    else:
        thresh = diff_norm.mean() + diff_norm.std()
        binary = (diff_norm > thresh).astype(np.uint8) * 255

    urban_mask = _detect_urban(after)
    veg_mask   = _detect_vegetation(before)

    combined = np.zeros((h, w, 3), dtype=np.uint8)
    combined[binary > 0]     = [255, 100, 0]
    combined[urban_mask > 0] = [0, 200, 255]
    combined[veg_mask > 0]   = [0, 255, 100]

    return {
        "diff": diff_norm,
        "mask": binary,
        "segmentation": combined,
        "change_pct":    float((binary > 0).sum() / binary.size * 100),
        "urban_pct":     float((urban_mask > 0).sum() / urban_mask.size * 100),
        "vegetation_pct":float((veg_mask > 0).sum() / veg_mask.size * 100),
        "mode": "enhanced_basic",
    }


def _detect_urban(img: np.ndarray) -> np.ndarray:
    """Detect urban/built-up areas (high brightness, low saturation)."""
    if HAS_CV2:
        gray = cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_RGB2GRAY)
        hsv  = cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_RGB2HSV)
        mask = (gray > 120) & (hsv[:, :, 1] < 50)
    else:
        r = img[:, :, 0].astype(np.float32)
        g = img[:, :, 1].astype(np.float32)
        b = img[:, :, 2].astype(np.float32)
        brightness = (r + g + b) / 3.0
        # Approximate low saturation: max channel - min channel is small
        ch_max = np.maximum(np.maximum(r, g), b)
        ch_min = np.minimum(np.minimum(r, g), b)
        saturation_range = ch_max - ch_min          # shape (H, W) — scalar per pixel
        mask = (brightness > 120) & (saturation_range < 40)
    return mask.astype(np.uint8) * 255


def _detect_vegetation(img: np.ndarray) -> np.ndarray:
    """Detect vegetation using green dominance index."""
    r = img[:, :, 0].astype(np.float32)
    g = img[:, :, 1].astype(np.float32)
    b = img[:, :, 2].astype(np.float32)
    veg_index = g - 0.5 * (r + b)
    return (veg_index > 15).astype(np.uint8) * 255


# ---- Lightweight U-Net ----

def _get_unet_model():
    """Return a lightweight U-Net for binary change detection."""
    import torch
    import torch.nn as nn

    class DoubleConv(nn.Module):
        def __init__(self, in_ch, out_ch):
            super().__init__()
            self.net = nn.Sequential(
                nn.Conv2d(in_ch, out_ch, 3, padding=1), nn.BatchNorm2d(out_ch), nn.ReLU(inplace=True),
                nn.Conv2d(out_ch, out_ch, 3, padding=1), nn.BatchNorm2d(out_ch), nn.ReLU(inplace=True),
            )
        def forward(self, x): return self.net(x)

    class MiniUNet(nn.Module):
        def __init__(self):
            super().__init__()
            self.enc1 = DoubleConv(6, 32)   # 6 channels: before(3) + after(3)
            self.enc2 = DoubleConv(32, 64)
            self.pool = nn.MaxPool2d(2)
            self.bottleneck = DoubleConv(64, 128)
            self.up1 = nn.ConvTranspose2d(128, 64, 2, stride=2)
            self.dec1 = DoubleConv(128, 64)
            self.up2 = nn.ConvTranspose2d(64, 32, 2, stride=2)
            self.dec2 = DoubleConv(64, 32)
            self.out = nn.Conv2d(32, 3, 1)  # 3 classes: unchanged, urban, vegetation

        def forward(self, x):
            e1 = self.enc1(x)
            e2 = self.enc2(self.pool(e1))
            b = self.bottleneck(self.pool(e2))
            d1 = self.dec1(torch.cat([self.up1(b), e2], dim=1))
            d2 = self.dec2(torch.cat([self.up2(d1), e1], dim=1))
            return self.out(d2)

    model = MiniUNet()
    model.eval()
    return model


def _run_unet(model, img_before: np.ndarray, img_after: np.ndarray) -> dict:
    """Run U-Net inference on image pair."""
    import torch
    import torchvision.transforms as T

    transform = T.Compose([T.ToTensor(), T.Normalize([0.5]*3, [0.5]*3)])

    h, w = 256, 256
    before_pil = Image.fromarray(img_before).resize((w, h))
    after_pil = Image.fromarray(img_after).resize((w, h))

    t_before = transform(before_pil)
    t_after = transform(after_pil)

    # Concatenate along channel dim
    inp = torch.cat([t_before, t_after], dim=0).unsqueeze(0)

    with torch.no_grad():
        logits = model(inp)
        pred = torch.argmax(logits, dim=1).squeeze().numpy()

    # Map classes to colors
    seg = np.zeros((h, w, 3), dtype=np.uint8)
    seg[pred == 1] = [0, 200, 255]   # Urban: cyan
    seg[pred == 2] = [0, 255, 100]   # Vegetation: green

    change_mask = (pred > 0).astype(np.uint8) * 255
    change_pct = (pred > 0).sum() / pred.size * 100
    urban_pct = (pred == 1).sum() / pred.size * 100
    veg_pct = (pred == 2).sum() / pred.size * 100

    return {
        "diff": change_mask,
        "mask": change_mask,
        "segmentation": seg,
        "change_pct": float(change_pct),
        "urban_pct": float(urban_pct),
        "vegetation_pct": float(veg_pct),
        "mode": "unet",
    }


def save_change_map(result: dict, cache_key: str) -> str:
    """Save change map image as a vivid RGBA overlay PNG."""
    seg = result.get("segmentation")
    diff = result.get("diff")

    if seg is not None and seg.ndim == 3:
        # Use segmentation colors directly
        colored = seg.astype(np.uint8)
    elif diff is not None:
        # Colorize grayscale diff: blue (low) → yellow → red (high)
        d = diff.astype(np.float32) / 255.0
        r = np.clip(d * 2.5, 0, 1)
        g = np.clip(1.0 - np.abs(d - 0.4) * 3, 0, 1)
        b = np.clip(1.0 - d * 3, 0, 1)
        colored = (np.stack([r, g, b], axis=2) * 255).astype(np.uint8)
    else:
        return ""

    # Alpha: transparent where no change, opaque where change detected
    if diff is not None:
        alpha = np.clip(diff.astype(np.float32) / 255.0 * 2.5, 0, 1)
        alpha = (alpha * 200).astype(np.uint8)
    else:
        gray = colored.mean(axis=2)
        alpha = np.clip(gray / 255.0 * 200, 0, 200).astype(np.uint8)

    rgba = np.zeros((*colored.shape[:2], 4), dtype=np.uint8)
    rgba[:, :, :3] = colored
    rgba[:, :, 3]  = alpha

    img = Image.fromarray(rgba, "RGBA")
    path = STATIC_DIR / f"change_{cache_key}.png"
    img.save(str(path), "PNG")
    return f"/static/images/change_{cache_key}.png"
