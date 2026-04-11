import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 min for ML processing
});

/**
 * Run full ML analysis pipeline (all techniques)
 */
export async function runFullAnalysis(payload) {
  const res = await api.post("/analyze", payload);
  return res.data;
}

/**
 * Fetch satellite image for a location and year
 */
export async function fetchSatelliteImage(lat, lon, year) {
  const res = await api.get("/satellite", { params: { lat, lon, year } });
  return res.data;
}

/**
 * Run change detection between two years
 */
export async function detectChange(payload) {
  const res = await api.post("/detect-change", payload);
  return res.data;
}

/**
 * Fetch computed statistics
 */
export async function fetchStats(lat, lon, yearFrom, yearTo) {
  const res = await api.get("/stats", {
    params: { lat, lon, year_from: yearFrom, year_to: yearTo },
  });
  return res.data;
}

/**
 * Geocode a place name to coordinates using Nominatim (free, no key needed)
 */
export async function geocodeLocation(query) {
  const res = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: { q: query, format: "json", limit: 5, addressdetails: 1 },
    headers: { "Accept-Language": "en" },
  });
  return res.data.map((f) => ({
    name: f.display_name,
    lat: parseFloat(f.lat),
    lon: parseFloat(f.lon),
  }));
}
