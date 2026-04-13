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
    if (overlayRef.current) { map.removeLayer(overlayRef.current); overlayRef.current = null; }
    if (!visible || !location || !changeMapUrl) return;

    // Backend stitches a 3x3 grid of zoom-8 EPSG4326 tiles
    // Each tile at zoom 8 = 360/256 = 1.40625° wide, 180/128 = 1.40625° tall
    // 3 tiles = 4.21875° in each direction, centered on location
    const half = 1.40625 * 1.5; // 3 tiles / 2
    const bounds = [
      [location.lat - half, location.lon - half],
      [location.lat + half, location.lon + half],
    ];

    overlayRef.current = L.imageOverlay(`${API_URL}${changeMapUrl}`, bounds, {
      opacity: 0.65,
      interactive: false,
      className: "change-overlay",
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
  const animRef = useRef(null);

  useEffect(() => {
    if (!visible || !location || !points?.length) return;

    // Create canvas and append to map container directly
    const container = map.getContainer();
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;z-index:450;opacity:0;transition:opacity 0.5s;";
    container.appendChild(canvas);
    canvasRef.current = canvas;

    // Fade in
    requestAnimationFrame(() => { canvas.style.opacity = "0.7"; });

    const draw = () => {
      if (!canvas || !map) return;
      const size = map.getSize();
      canvas.width  = size.x;
      canvas.height = size.y;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, size.x, size.y);

      points.forEach(({ lat, lon, intensity }) => {
        try {
          const pt = map.latLngToContainerPoint([lat, lon]);
          const r = 25 + intensity * 45;
          const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
          if (intensity > 0.5) {
            grad.addColorStop(0, `rgba(255,107,107,${(intensity * 0.8).toFixed(2)})`);
            grad.addColorStop(0.5, `rgba(255,107,107,${(intensity * 0.3).toFixed(2)})`);
            grad.addColorStop(1, "rgba(255,107,107,0)");
          } else {
            grad.addColorStop(0, `rgba(100,255,218,${(intensity * 0.7).toFixed(2)})`);
            grad.addColorStop(0.5, `rgba(100,255,218,${(intensity * 0.25).toFixed(2)})`);
            grad.addColorStop(1, "rgba(100,255,218,0)");
          }
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
          ctx.fill();
        } catch {}
      });
    };

    draw();
    map.on("move zoom resize moveend zoomend", draw);

    return () => {
      map.off("move zoom resize moveend zoomend", draw);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvasRef.current = null;
    };
  }, [map, location, visible, points]);

  return null;
}

export default function MapView() {
  const { location, setLocation, analysisComplete, result, changeMap } = useAnalysis();
  const [showOverlay, setShowOverlay] = React.useState(true);

  // No fake random points — use real change map image overlay only
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
          <RealChangeOverlay location={location} changeMapUrl={changeMap} visible={showOverlay} />
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
              ? {background:"rgba(100,255,218,0.1)",borderColor:"rgba(100,255,218,0.3)",color:"#64FFDA"}
              : {background:"rgba(6,15,30,0.8)",borderColor:"rgba(100,255,218,0.1)",color:"rgba(136,146,176,0.5)"}}
          >
            {showOverlay ? "Hide Heatmap" : "Show Heatmap"}
          </motion.button>
        </div>
      )}

      {!location && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
          <div className="px-8 py-6 text-center rounded-2xl"
            style={{background:"rgba(6,15,30,0.9)",border:"1px solid rgba(100,255,218,0.15)",backdropFilter:"blur(12px)"}}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-3"
              style={{background:"rgba(100,255,218,0.1)",border:"1px solid rgba(100,255,218,0.2)"}}>
              <span className="text-sm font-mono" style={{color:"#64FFDA"}}>◎</span>
            </div>
            <p className="text-sm font-semibold" style={{color:"#CCD6F6"}}>Select a Location</p>
            <p className="text-xs mt-1.5" style={{color:"rgba(136,146,176,0.6)"}}>Click anywhere on the map or search in the sidebar</p>
          </div>
        </div>
      )}

      {/* Coordinates */}
      {location && (
        <div className="absolute bottom-4 right-4 z-[500] px-3 py-1.5 rounded-lg"
          style={{background:"rgba(6,15,30,0.9)",border:"1px solid rgba(100,255,218,0.15)",backdropFilter:"blur(8px)"}}>
          <p className="text-[10px] font-mono" style={{color:"rgba(136,146,176,0.7)"}}>
            <span style={{color:"#64FFDA"}}>{location.lat.toFixed(5)}°N</span>
            <span style={{color:"rgba(100,255,218,0.2)"}}> / </span>
            <span style={{color:"#CCD6F6"}}>{location.lon.toFixed(5)}°E</span>
          </p>
        </div>
      )}

      {analysisComplete && showOverlay && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}}
          className="absolute top-4 left-4 z-[500] px-3 py-2.5 rounded-xl"
          style={{background:"rgba(6,15,30,0.9)",border:"1px solid rgba(100,255,218,0.15)",backdropFilter:"blur(8px)"}}>
          <p className="text-[9px] font-mono uppercase tracking-widest mb-2"
            style={{color:"rgba(100,255,218,0.6)"}}>Change Intensity</p>
          <div className="w-28 h-1.5 rounded-full"
            style={{background:"linear-gradient(90deg,rgba(100,255,218,0.6),rgba(255,107,107,0.8))"}} />
          <div className="flex justify-between text-[8px] font-mono mt-1"
            style={{color:"rgba(136,146,176,0.4)"}}>
            <span>Low</span><span>High</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
