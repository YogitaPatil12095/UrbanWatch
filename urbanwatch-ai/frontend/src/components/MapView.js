import React, { useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { motion } from "framer-motion";
import { useAnalysis } from "../context/AnalysisContext";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const neonIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#00d4ff;border:2px solid #fff;box-shadow:0 0 12px #00d4ff,0 0 24px #00d4ff88;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FlyToLocation({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lon) map.flyTo([lat, lon], 12, { duration: 1.5 });
  }, [lat, lon, map]);
  return null;
}

function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

function RealChangeOverlay({ location, changeMapUrl, visible }) {
  const map = useMap();
  const overlayRef = useRef(null);
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  useEffect(() => {
    if (!visible || !location || !changeMapUrl) {
      if (overlayRef.current) { map.removeLayer(overlayRef.current); overlayRef.current = null; }
      return;
    }
    if (overlayRef.current) map.removeLayer(overlayRef.current);

    const tileSize = 1.40625;
    const bounds = [
      [location.lat - tileSize * 1.5, location.lon - tileSize * 1.5],
      [location.lat + tileSize * 1.5, location.lon + tileSize * 1.5],
    ];

    overlayRef.current = L.imageOverlay(`${API_URL}${changeMapUrl}`, bounds, {
      opacity: 0.6,
      interactive: false,
    });
    map.addLayer(overlayRef.current);

    return () => {
      if (overlayRef.current) { map.removeLayer(overlayRef.current); overlayRef.current = null; }
    };
  }, [map, location, changeMapUrl, visible, API_URL]);

  return null;
}

function HeatmapOverlay({ location, visible, points }) {
  const map = useMap();
  const canvasRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!visible || !location || !points?.length) {
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
      return;
    }
    if (layerRef.current) map.removeLayer(layerRef.current);

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
        points.forEach(({ lat, lon, intensity }) => {
          const pt = map.latLngToContainerPoint([lat, lon]);
          const r = 30 + intensity * 40;
          const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
          if (intensity > 0.5) {
            grad.addColorStop(0, `rgba(233,69,96,${intensity * 0.75})`);
            grad.addColorStop(1, "rgba(233,69,96,0)");
          } else {
            grad.addColorStop(0, `rgba(22,160,133,${intensity * 0.65})`);
            grad.addColorStop(1, "rgba(22,160,133,0)");
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
  }, [map, location, visible, points]);

  return null;
}

export default function MapView() {
  const { location, setLocation, analysisComplete, result, changeMap } = useAnalysis();
  const [showOverlay, setShowOverlay] = React.useState(true);

  const heatmapPoints = useMemo(() => {
    if (!analysisComplete || !location || !result) return [];
    const rng = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };
    const changePct  = result.change_pct  || 10;
    const urbanPct   = result.urban_pct   || 5;
    const anomalyPct = result.anomaly_pct || 3;
    const spread  = 0.03 + (changePct / 100) * 0.07;
    const nPoints = Math.max(30, Math.min(120, Math.round(changePct * 4)));
    return Array.from({ length: nPoints }, (_, i) => ({
      lat: location.lat + (rng(i * 3.1 + changePct) - 0.5) * spread,
      lon: location.lon + (rng(i * 7.3 + urbanPct)  - 0.5) * spread,
      intensity: Math.min(1, rng(i * 13.7 + anomalyPct) * (0.3 + anomalyPct / 20)),
    }));
  }, [analysisComplete, location, result]);

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
          <>
            <RealChangeOverlay location={location} changeMapUrl={changeMap} visible={showOverlay} />
            <HeatmapOverlay location={location} visible={showOverlay} points={heatmapPoints} />
          </>
        )}
      </MapContainer>

      {analysisComplete && (
        <div className="absolute bottom-6 left-6 z-[500]">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowOverlay((v) => !v)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono border transition-all"
            style={showOverlay
              ? {background:"rgba(233,69,96,0.15)",borderColor:"rgba(233,69,96,0.4)",color:"#E94560"}
              : {background:"rgba(26,26,46,0.8)",borderColor:"rgba(233,69,96,0.15)",color:"rgba(245,240,235,0.4)"}}
          >
            {showOverlay ? "🔥 Hide Heatmap" : "🔥 Show Heatmap"}
          </motion.button>
        </div>
      )}

      {!location && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
          <div className="px-6 py-4 text-center rounded-2xl"
            style={{background:"rgba(26,26,46,0.85)",border:"1px solid rgba(233,69,96,0.2)",backdropFilter:"blur(12px)"}}>
            <div className="text-2xl mb-2">🛰️</div>
            <p className="text-sm font-mono" style={{color:"rgba(245,240,235,0.6)"}}>Click anywhere to select a location</p>
            <p className="text-xs font-mono mt-1" style={{color:"rgba(233,69,96,0.5)"}}>or search in the sidebar</p>
          </div>
        </div>
      )}

      {/* Coordinates */}
      {location && (
        <div className="absolute bottom-4 right-4 z-[500] px-3 py-1.5 rounded-lg"
          style={{background:"rgba(26,26,46,0.9)",border:"1px solid rgba(233,69,96,0.2)",backdropFilter:"blur(8px)"}}>
          <p className="text-[10px] font-mono" style={{color:"rgba(245,240,235,0.5)"}}>
            <span style={{color:"#E94560"}}>{location.lat.toFixed(5)}°N</span>
            <span style={{color:"rgba(245,240,235,0.2)"}}> / </span>
            <span style={{color:"#FF6B7A"}}>{location.lon.toFixed(5)}°E</span>
          </p>
        </div>
      )}

      {analysisComplete && showOverlay && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="absolute top-4 left-4 z-[500] px-3 py-2.5 rounded-xl"
          style={{background:"rgba(26,26,46,0.9)",border:"1px solid rgba(233,69,96,0.2)",backdropFilter:"blur(8px)"}}>
          <p className="text-[9px] font-mono uppercase tracking-widest mb-2"
            style={{color:"rgba(233,69,96,0.6)"}}>Change Intensity</p>
          <div className="w-28 h-1.5 rounded-full"
            style={{background:"linear-gradient(90deg,rgba(22,160,133,0.7),rgba(233,69,96,0.9))"}} />
          <div className="flex justify-between text-[8px] font-mono mt-1"
            style={{color:"rgba(245,240,235,0.25)"}}>
            <span>Low</span><span>High</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
