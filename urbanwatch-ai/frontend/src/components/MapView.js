import React, { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { motion } from "framer-motion";
import { useAnalysis } from "../context/AnalysisContext";

// Fix default marker icon (Leaflet + webpack issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom neon marker
const neonIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:16px;height:16px;border-radius:50%;
    background:#00d4ff;border:2px solid #fff;
    box-shadow:0 0 12px #00d4ff,0 0 24px #00d4ff88;
    position:relative;
  ">
    <div style="
      position:absolute;inset:-6px;border-radius:50%;
      background:#00d4ff22;animation:ping 1.5s ease-in-out infinite;
    "></div>
  </div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Component to fly to new location
function FlyToLocation({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lon) {
      map.flyTo([lat, lon], 12, { duration: 1.5 });
    }
  }, [lat, lon, map]);
  return null;
}

// Component to handle map clicks
function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

// Canvas heatmap overlay drawn directly on map
function HeatmapOverlay({ location, visible }) {
  const map = useMap();
  const canvasRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!visible || !location) {
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
      return;
    }

    // Remove old layer
    if (layerRef.current) map.removeLayer(layerRef.current);

    // Create canvas overlay
    const CanvasLayer = L.Layer.extend({
      onAdd(m) {
        const canvas = L.DomUtil.create("canvas", "");
        canvas.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;z-index:400;opacity:0.65;";
        m.getPanes().overlayPane.appendChild(canvas);
        canvasRef.current = canvas;
        m.on("moveend zoomend resize", this._draw, this);
        this._draw();
      },
      onRemove(m) {
        if (canvasRef.current) canvasRef.current.remove();
        m.off("moveend zoomend resize", this._draw, this);
      },
      _draw() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const size = map.getSize();
        canvas.width = size.x;
        canvas.height = size.y;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, size.x, size.y);

        // Generate change points around location
        const rng = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };
        const points = Array.from({ length: 60 }, (_, i) => ({
          lat: location.lat + (rng(i * 3.1) - 0.5) * 0.12,
          lon: location.lon + (rng(i * 7.3) - 0.5) * 0.12,
          intensity: rng(i * 13.7),
        }));

        points.forEach(({ lat, lon, intensity }) => {
          const pt = map.latLngToContainerPoint([lat, lon]);
          const r = 30 + intensity * 40;
          const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
          if (intensity > 0.6) {
            grad.addColorStop(0, `rgba(255,0,110,${intensity * 0.7})`);
            grad.addColorStop(1, "rgba(255,0,110,0)");
          } else {
            grad.addColorStop(0, `rgba(0,212,255,${intensity * 0.6})`);
            grad.addColorStop(1, "rgba(0,212,255,0)");
          }
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
          ctx.fill();
        });
      },
    });

    layerRef.current = new CanvasLayer();
    map.addLayer(layerRef.current);

    return () => {
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
    };
  }, [map, location, visible]);

  return null;
}

export default function MapView() {
  const { location, setLocation, analysisComplete } = useAnalysis();
  const [showOverlay, setShowOverlay] = useState(true);

  const handleMapClick = ({ lat, lng }) => {
    setLocation({ lat, lon: lng, name: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E` });
  };

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[location?.lat || 28.6139, location?.lon || 77.209]}
        zoom={11}
        style={{ width: "100%", height: "100%", background: "#050810" }}
        zoomControl={true}
      >
        {/* Dark satellite-style tile layer — free, no token */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
        />

        <ClickHandler onMapClick={handleMapClick} />

        {location && (
          <>
            <FlyToLocation lat={location.lat} lon={location.lon} />
            <Marker position={[location.lat, location.lon]} icon={neonIcon} />
          </>
        )}

        {analysisComplete && (
          <HeatmapOverlay location={location} visible={showOverlay} />
        )}
      </MapContainer>

      {/* Overlay toggle */}
      {analysisComplete && (
        <div className="absolute bottom-6 left-6 z-[500]">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowOverlay((v) => !v)}
            className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all ${
              showOverlay
                ? "bg-neon-blue/20 border-neon-blue/40 text-neon-blue"
                : "bg-white/5 border-white/10 text-slate-400"
            }`}
          >
            {showOverlay ? "🔥 Hide Heatmap" : "🔥 Show Heatmap"}
          </motion.button>
        </div>
      )}

      {/* Click hint */}
      {!location && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
          <div className="glass-card px-6 py-4 text-center border border-neon-blue/20">
            <p className="text-sm text-slate-400 font-mono">Click anywhere on the map to select a location</p>
          </div>
        </div>
      )}

      {/* Coordinates */}
      {location && (
        <div className="absolute bottom-6 right-6 z-[500] glass-card px-3 py-2 border border-white/10">
          <p className="text-xs font-mono text-slate-400">
            <span className="text-neon-blue">{location.lat.toFixed(5)}°N</span>
            {" / "}
            <span className="text-neon-pink">{location.lon.toFixed(5)}°E</span>
          </p>
        </div>
      )}

      {/* Legend */}
      {analysisComplete && showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-4 left-4 z-[500] glass-card p-3 border border-white/10"
        >
          <p className="text-[10px] font-mono text-slate-500 mb-2 uppercase tracking-wider">Change Intensity</p>
          <div className="w-24 h-2 rounded-full" style={{
            background: "linear-gradient(90deg, rgba(0,212,255,0.5), rgba(255,0,110,0.8))"
          }} />
          <div className="flex justify-between text-[9px] font-mono text-slate-600 mt-1">
            <span>Low</span><span>High</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
