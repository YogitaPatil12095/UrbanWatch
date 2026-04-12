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
    runAnalysis, analysisComplete, result,
  } = useAnalysis();

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try { setSuggestions(await geocodeLocation(searchQuery)); }
      catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 400);
  }, [searchQuery]);

  const selectLocation = (loc) => {
    setLocation(loc);
    setSearchQuery(loc.name.split(",")[0]);
    setSuggestions([]);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto panel-scroll">

      {/* Section: Location */}
      <div className="p-4 border-b" style={{borderColor:"rgba(233,69,96,0.1)"}}>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-3"
          style={{color:"rgba(233,69,96,0.6)"}}>Location</p>

        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
            style={{background:"rgba(15,15,26,0.7)",border:"1px solid rgba(233,69,96,0.2)"}}>
            <span className="text-sm" style={{color:"#E94560"}}>📍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city..."
              className="flex-1 bg-transparent text-xs font-mono outline-none"
              style={{color:"#F5F0EB"}}
            />
            {searching && (
              <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin"
                style={{borderColor:"rgba(233,69,96,0.5)",borderTopColor:"transparent"}} />
            )}
          </div>

          {suggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50 shadow-xl"
              style={{background:"#1A1A2E",border:"1px solid rgba(233,69,96,0.2)"}}>
              {suggestions.slice(0, 4).map((s, i) => (
                <button key={i} onClick={() => selectLocation(s)}
                  className="w-full text-left px-3 py-2 text-xs font-mono transition-colors border-b last:border-0"
                  style={{color:"rgba(245,240,235,0.7)",borderColor:"rgba(233,69,96,0.08)"}}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(233,69,96,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  {s.name.split(",").slice(0,2).join(",")}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {location && (
          <div className="mt-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{background:"#16A085"}} />
            <p className="text-[10px] font-mono" style={{color:"rgba(245,240,235,0.4)"}}>
              {location.lat.toFixed(4)}°N &nbsp;{location.lon.toFixed(4)}°E
            </p>
          </div>
        )}
      </div>

      {/* Section: Time Range */}
      <div className="p-4 border-b" style={{borderColor:"rgba(233,69,96,0.1)"}}>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-3"
          style={{color:"rgba(233,69,96,0.6)"}}>Time Range</p>

        <div className="space-y-4">
          {[
            { label: "From", value: yearFrom, color: "#E94560",
              onChange: (v) => { setYearFrom(v); if (v >= yearTo) setYearTo(v+1); },
              min: YEAR_MIN, max: YEAR_MAX - 1 },
            { label: "To", value: yearTo, color: "#FF6B7A",
              onChange: (v) => { setYearTo(v); if (v <= yearFrom) setYearFrom(v-1); },
              min: YEAR_MIN + 1, max: YEAR_MAX },
          ].map(({ label, value, color, onChange, min, max }) => (
            <div key={label}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-mono" style={{color:"rgba(245,240,235,0.4)"}}>{label}</span>
                <span className="text-xs font-bold font-mono" style={{color}}>{value}</span>
              </div>
              <input type="range" min={min} max={max} value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{background:`linear-gradient(90deg,${color} ${((value-YEAR_MIN)/(YEAR_MAX-YEAR_MIN))*100}%,rgba(45,45,74,0.8) 0%)`}}
              />
            </div>
          ))}
        </div>

        {/* Year timeline dots */}
        <div className="relative mt-3 h-5 flex items-center">
          <div className="absolute inset-x-0 h-px" style={{background:"rgba(233,69,96,0.1)"}} />
          {[2013,2016,2019,2022,2024].map((y) => (
            <div key={y} className="absolute flex flex-col items-center"
              style={{left:`${((y-YEAR_MIN)/(YEAR_MAX-YEAR_MIN))*100}%`}}>
              <div className="w-1 h-1 rounded-full"
                style={{background: y >= yearFrom && y <= yearTo ? "#E94560" : "rgba(45,45,74,0.8)"}} />
              <span className="text-[8px] font-mono mt-0.5"
                style={{color:"rgba(245,240,235,0.25)"}}>{y}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section: Detection Mode */}
      <div className="p-4 border-b" style={{borderColor:"rgba(233,69,96,0.1)"}}>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-3"
          style={{color:"rgba(233,69,96,0.6)"}}>Detection Mode</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "basic",    label: "Basic",    sub: "Image diff + Otsu" },
            { id: "advanced", label: "Advanced", sub: "AI / U-Net CNN" },
          ].map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className="p-2.5 rounded-lg text-left transition-all duration-200 border"
              style={{
                background:  mode === m.id ? "rgba(233,69,96,0.12)" : "rgba(15,15,26,0.5)",
                borderColor: mode === m.id ? "rgba(233,69,96,0.5)"  : "rgba(233,69,96,0.1)",
              }}>
              <div className="text-xs font-semibold font-mono"
                style={{color: mode === m.id ? "#E94560" : "rgba(245,240,235,0.6)"}}>{m.label}</div>
              <div className="text-[9px] font-mono mt-0.5"
                style={{color:"rgba(245,240,235,0.25)"}}>{m.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Run button */}
      <div className="p-4">
        <motion.button onClick={runAnalysis} disabled={loading || !location}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className="w-full py-3 rounded-xl font-semibold text-sm font-mono transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg,#E94560,#C73650)",
            color: "#F5F0EB",
            boxShadow: loading ? "none" : "0 4px 16px rgba(233,69,96,0.35)",
          }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-xs truncate">{loadingStep || "Processing..."}</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>🚀</span> Run Analysis
            </span>
          )}
        </motion.button>
      </div>

      {/* Quick stats — shown after analysis */}
      {analysisComplete && result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mx-4 mb-4 rounded-xl p-3 border"
          style={{background:"rgba(15,15,26,0.6)",borderColor:"rgba(233,69,96,0.15)"}}>
          <p className="text-[9px] font-mono uppercase tracking-widest mb-2"
            style={{color:"rgba(233,69,96,0.5)"}}>Quick Summary</p>
          <div className="space-y-1.5">
            {[
              { label: "Urban change",  value: `${result.urban_pct?.toFixed(1)}%`,     color: "#E94560" },
              { label: "Veg loss",      value: `${result.vegetation_pct?.toFixed(1)}%`, color: "#FF6B7A" },
              { label: "NDVI delta",    value: `${(result.ndvi_delta*100)?.toFixed(1)}%`, color: "#16A085" },
              { label: "Risk",          value: result.risk_level,                       color: result.risk_level === "Low" ? "#16A085" : result.risk_level === "Moderate" ? "#f59e0b" : "#E94560" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-[10px] font-mono" style={{color:"rgba(245,240,235,0.35)"}}>{item.label}</span>
                <span className="text-[10px] font-bold font-mono" style={{color:item.color}}>{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Data sources badge */}
      <div className="mt-auto p-4 border-t" style={{borderColor:"rgba(233,69,96,0.08)"}}>
        <p className="text-[9px] font-mono" style={{color:"rgba(245,240,235,0.2)"}}>
          Data: NASA GIBS · OpenStreetMap · Nominatim
        </p>
      </div>
    </div>
  );
}
