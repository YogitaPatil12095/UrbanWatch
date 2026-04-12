import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useAnalysis } from "../context/AnalysisContext";
import { geocodeLocation } from "../utils/api";

const YEAR_MIN = 2013;
const YEAR_MAX = 2024;

export default function ControlPanel() {
  const {
    location, setLocation,
    yearFrom, setYearFrom,
    yearTo, setYearTo,
    mode, setMode,
    loading, loadingStep,
    runAnalysis,
  } = useAnalysis();

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  // Debounced geocode search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await geocodeLocation(searchQuery);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [searchQuery]);

  const selectLocation = (loc) => {
    setLocation(loc);
    setSearchQuery(loc.name);
    setSuggestions([]);
  };

  return (
    <div className="p-4 space-y-5" style={{background:"rgba(15,15,26,0.4)"}}>
      {/* Title */}
      <div className="pt-2">
        <h2 className="text-xs font-mono uppercase tracking-widest mb-1" style={{color:"rgba(245,240,235,0.4)"}}>
          Analysis Controls
        </h2>
        <div className="h-px" style={{background:"linear-gradient(90deg,rgba(233,69,96,0.5),transparent)"}} />
      </div>

      {/* Location Search */}
      <div className="space-y-2">
        <label className="text-xs font-mono flex items-center gap-2" style={{color:"rgba(245,240,235,0.5)"}}>
          <span style={{color:"#E94560"}}>📍</span> Location
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city or coordinates..."
            className="input-dark pr-8"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-neon-blue/40 border-t-neon-blue rounded-full animate-spin" />
            </div>
          )}
          {suggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50"
              style={{background:"#1A1A2E",border:"1px solid rgba(233,69,96,0.25)"}}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => selectLocation(s)}
                  className="w-full text-left px-4 py-2.5 text-xs font-mono transition-colors border-b last:border-0"
                  style={{color:"rgba(245,240,235,0.7)",borderColor:"rgba(233,69,96,0.1)"}}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(233,69,96,0.1)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  📍 {s.name}
                </button>
              ))}
            </motion.div>
          )}
        </div>
        {location && (
          <p className="text-xs text-slate-500 font-mono">
            {location.lat.toFixed(4)}°N, {location.lon.toFixed(4)}°E
          </p>
        )}
      </div>

      {/* Year Range */}
      <div className="space-y-3">
        <label className="text-xs font-mono flex items-center gap-2" style={{color:"rgba(245,240,235,0.5)"}}>
          <span style={{color:"#FF6B7A"}}>📅</span> Time Range
        </label>

        <div className="space-y-3">
          {/* Year From */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span style={{color:"rgba(245,240,235,0.4)"}}>From</span>
              <span style={{color:"#E94560"}}>{yearFrom}</span>
            </div>
            <input type="range" min={YEAR_MIN} max={YEAR_MAX - 1} value={yearFrom}
              onChange={(e) => { const v = Number(e.target.value); setYearFrom(v); if (v >= yearTo) setYearTo(v + 1); }}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{background:`linear-gradient(90deg,#E94560 ${((yearFrom-YEAR_MIN)/(YEAR_MAX-YEAR_MIN))*100}%,#2D2D4A 0%)`}}
            />
          </div>
          {/* Year To */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span style={{color:"rgba(245,240,235,0.4)"}}>To</span>
              <span style={{color:"#FF6B7A"}}>{yearTo}</span>
            </div>
            <input type="range" min={YEAR_MIN + 1} max={YEAR_MAX} value={yearTo}
              onChange={(e) => { const v = Number(e.target.value); setYearTo(v); if (v <= yearFrom) setYearFrom(v - 1); }}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{background:`linear-gradient(90deg,#FF6B7A ${((yearTo-YEAR_MIN)/(YEAR_MAX-YEAR_MIN))*100}%,#2D2D4A 0%)`}}
            />
          </div>
        </div>

        {/* Timeline visual */}
        <div className="relative h-8 flex items-center">
          <div className="absolute inset-x-0 h-px bg-dark-500" />
          {Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i).map((y) => (
            <div
              key={y}
              className="absolute flex flex-col items-center"
              style={{ left: `${((y - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100}%` }}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  y >= yearFrom && y <= yearTo
                    ? "bg-neon-blue"
                    : "bg-dark-500"
                }`}
              />
              {(y === YEAR_MIN || y === YEAR_MAX || y % 3 === 0) && (
                <span className="text-[9px] font-mono text-slate-600 mt-1">{y}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detection Mode */}
      <div className="space-y-2">
        <label className="text-xs font-mono flex items-center gap-2" style={{color:"rgba(245,240,235,0.5)"}}>
          <span style={{color:"#16A085"}}>🧠</span> Detection Mode
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "basic", label: "Basic", desc: "Image diff" },
            { id: "advanced", label: "Advanced", desc: "AI/U-Net" },
          ].map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className="p-3 rounded-xl border text-left transition-all duration-200"
              style={{
                borderColor: mode === m.id ? "rgba(233,69,96,0.6)" : "rgba(245,240,235,0.1)",
                background:  mode === m.id ? "rgba(233,69,96,0.12)" : "rgba(45,45,74,0.4)",
                color:       mode === m.id ? "#E94560" : "rgba(245,240,235,0.5)",
              }}>
              <div className="text-xs font-semibold font-mono">{m.label}</div>
              <div className="text-[10px] mt-0.5" style={{color:"rgba(245,240,235,0.35)"}}>{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Run Analysis Button */}
      <motion.button onClick={runAnalysis} disabled={loading || !location}
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        className="w-full py-3.5 rounded-xl font-semibold text-sm font-mono transition-all duration-300 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "linear-gradient(135deg,#E94560,#C73650)",
          color: "#F5F0EB",
          boxShadow: loading ? "none" : "0 4px 20px rgba(233,69,96,0.4)",
        }}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            {loadingStep || "Processing..."}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">🚀 Run Analysis</span>
        )}
      </motion.button>

      {/* Info box */}
      <div className="glass-card p-3 border border-white/5">
        <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
          Satellite data sourced from Sentinel-2 via Google Earth Engine. Analysis covers a ~10km² area around the selected point.
        </p>
      </div>
    </div>
  );
}
