# 🛰️ UrbanWatch AI

Satellite-powered urban growth and environmental change detection platform.

## Architecture

```
Frontend (React) → Backend (FastAPI) → Satellite APIs (GEE / Sentinel Hub)
                                     → ML Engine (OpenCV + PyTorch U-Net)
```

---

## Quick Start

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your API keys

python run.py
# API running at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Edit .env — add your Mapbox token

npm install
npm start
# App running at http://localhost:3000
```

---

## API Keys Required

| Service | Purpose | Get it |
|---------|---------|--------|
| Mapbox | Map display + geocoding | https://account.mapbox.com |
| Google Earth Engine | Satellite imagery (primary) | https://earthengine.google.com |
| Sentinel Hub | Satellite imagery (alternative) | https://www.sentinel-hub.com |

> Without GEE/Sentinel Hub keys, the app uses synthetic demo imagery. All analysis features still work.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/satellite?lat=&lon=&year=` | Fetch satellite image |
| POST | `/detect-change` | Run change detection |
| GET | `/stats?lat=&lon=&year_from=&year_to=` | Get statistics |
| GET | `/health` | Health check |

### POST /detect-change body:
```json
{
  "lat": 28.6139,
  "lon": 77.209,
  "year_from": 2016,
  "year_to": 2024,
  "mode": "basic"
}
```

---

## Google Earth Engine Setup

1. Register at https://earthengine.google.com
2. Create a service account in Google Cloud Console
3. Download the JSON key file → save as `backend/gee-key.json`
4. Set `GEE_SERVICE_ACCOUNT` in `.env`

---

## Deployment

### Frontend → Vercel
```bash
cd frontend
npm run build
# Deploy build/ folder to Vercel
# Set REACT_APP_MAPBOX_TOKEN and REACT_APP_API_URL in Vercel env vars
```

### Backend → Render / Railway
```bash
# Set environment variables in your platform dashboard
# Start command: python run.py
# Or: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

---

## Features

- Interactive Mapbox map with click-to-select location
- Location search with geocoding
- Year range slider (2013–2024)
- Basic mode: grayscale differencing + Otsu threshold
- Advanced mode: lightweight U-Net segmentation
- Heatmap overlay on map
- Before/after slider comparison
- Insights dashboard with charts
- Smart alerts for significant changes
- Synthetic demo mode (no API keys needed)
