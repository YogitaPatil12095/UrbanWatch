import React, { createContext, useContext, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { runFullAnalysis } from "../utils/api";

const AnalysisContext = createContext(null);

export function AnalysisProvider({ children }) {
  const [location, setLocation]   = useState({ lat: 28.6139, lon: 77.209, name: "New Delhi, India" });
  const [yearFrom, setYearFrom]   = useState(2016);
  const [yearTo, setYearTo]       = useState(2024);
  const [mode, setMode]           = useState("basic");

  // All analysis results from /analyze
  const [result, setResult]       = useState(null);
  const [alerts, setAlerts]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Convenience accessors
  const imageFrom    = result?.image_from_url   || null;
  const imageTo      = result?.image_to_url     || null;
  const changeMap    = result?.change_map_url   || null;
  const stats        = result ? {
    urban_expansion_pct: result.urban_pct,
    vegetation_loss_pct: result.vegetation_pct,
    area_changed_km2:    result.change_pct * 1.2,   // approximate
    confidence:          0.85,
    cloud_cover_pct:     5.0,
    resolution:          "10m",
    mode:                result.detection_mode,
  } : null;

  const runAnalysis = useCallback(async () => {
    if (!location) { toast.error("Select a location first"); return; }
    setLoading(true);
    setAnalysisComplete(false);
    setAlerts([]);
    setResult(null);

    const steps = [
      "Fetching satellite imagery...",
      "Running change detection...",
      "Computing spectral indices (NDVI, NDBI, MNDWI)...",
      "K-Means land cover classification...",
      "Z-Score anomaly detection...",
      "PCA change vector analysis...",
      "Edge detection & infrastructure mapping...",
      "Computing risk score...",
    ];

    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setLoadingStep(steps[stepIdx]);
    }, 1800);

    setLoadingStep(steps[0]);

    try {
      const data = await runFullAnalysis({
        lat: location.lat,
        lon: location.lon,
        year_from: yearFrom,
        year_to: yearTo,
        mode,
      });

      setResult(data);

      // Smart alerts
      const newAlerts = [];
      if (data.urban_pct > 15)
        newAlerts.push({ type: "warning", message: "High urban growth detected", icon: "🏙️" });
      if (data.vegetation_pct > 10)
        newAlerts.push({ type: "danger", message: "Significant vegetation loss observed", icon: "🌿" });
      if (data.anomaly_pct > 20)
        newAlerts.push({ type: "warning", message: `Anomalous change: ${data.anomaly_pct.toFixed(1)}% of area`, icon: "⚠️" });
      if (data.risk_level === "High" || data.risk_level === "Critical")
        newAlerts.push({ type: "danger", message: `${data.risk_level} environmental risk detected`, icon: "🚨" });
      if (data.infra_growth_pct > 2)
        newAlerts.push({ type: "info", message: `Infrastructure expansion: +${data.infra_growth_pct.toFixed(1)}%`, icon: "🏗️" });
      if (data.ndvi_delta < -0.05)
        newAlerts.push({ type: "danger", message: `NDVI dropped ${(data.ndvi_delta * 100).toFixed(1)}% — vegetation declining`, icon: "📉" });

      setAlerts(newAlerts);
      setAnalysisComplete(true);
      toast.success("Full analysis complete!");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || err.message || "Analysis failed");
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
      setLoadingStep("");
    }
  }, [location, yearFrom, yearTo, mode]);

  return (
    <AnalysisContext.Provider value={{
      location, setLocation,
      yearFrom, setYearFrom,
      yearTo, setYearTo,
      mode, setMode,
      result, imageFrom, imageTo, changeMap, stats, alerts,
      loading, loadingStep, analysisComplete,
      runAnalysis,
    }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export const useAnalysis = () => {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used within AnalysisProvider");
  return ctx;
};
