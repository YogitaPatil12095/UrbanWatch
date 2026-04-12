import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useAnalysis } from "../context/AnalysisContext";
import { geocodeLocation } from "../utils/api";

const YEAR_MIN = 2013;
const YEAR_MAX = 2024;

function SectionLabel({ children }) {
  return (
    <p className="section-label mb-3">{children}</p>
  );
}

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

      {/* ── Location ── */}
      <div className="p-5 border-b" style={{borderColor:"rgba(100,255,218,0.06)"}}>
        <SectionLabel>Location</SectionLabel>
        <div className="relative">
          <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
            style={{background:"rgba(10,25,47,0.8)",border:"1px solid rgba(100,255,218,0.15)"}}>
            <span className="text-sm" style={{color:"#64FFDA"}}>📍</span>
            <input type="text" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city or place..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{color:"#CCD6F6",fontFamily:"Sansation, Segoe UI, sans-serif"}}
            />
            {searching && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
                style={{borderColor:"rgba(100,255,218,0.3)",borderTopColor:"#64FFDA"}} />
            )}
          </div>

          {suggestions.length > 0 && (
            <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}
              className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-2xl"
              style={{background:"#112240",border:"1px solid rgba(100,255,218,0.15)"}}>
              {suggestions.slice(0,5).map((s,i) => (
                <button key={i} onClick={() => selectLocation(s)}
                  className="w-full text-left px-4 py-2.5 text-xs transition-colors border-b last:border-0"
                  style={{color:"rgba(204,214,246,0.8)",borderColor:"rgba(100,255,218,0.06)",fontFamily:"Sansation, Segoe UI, sans-serif"}}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(100,255,218,0.06)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  {s.name.split(",").slice(0,2).join(",")}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {location && (
          <div className="mt-2.5 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{background:"#64FFDA"}} />
            <p className="text-xs font-mono" style={{color:"rgba(136,146,176,0.6)"}}>
              {location.lat.toFixed(4)}°N · {location.lon.toFixed(4)}°E
            </p>
          </div>
        )}
      </div>

      {/* ── Time Range ── */}
      <div className="p-5 border-b" style={{borderColor:"rgba(100,255,218,0.06)"}}>
        <SectionLabel>Time Range</SectionLabel>
        <div className="space-y-5">
          {[
            { label:"From", value:yearFrom, color:"#64FFDA",
              onChange:(v)=>{setYearFrom(v);if(v>=yearTo)setYearTo(v+1);}, min:YEAR_MIN, max:YEAR_MAX-1 },
            { label:"To",   value:yearTo,   color:"#CCD6F6",
              onChange:(v)=>{setYearTo(v);if(v<=yearFrom)setYearFrom(v-1);}, min:YEAR_MIN+1, max:YEAR_MAX },
          ].map(({label,value,color,onChange,min,max}) => (
            <div key={label}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs" style={{color:"rgba(136,146,176,0.6)"}}>{label}</span>
                <span className="text-sm font-bold font-mono" style={{color}}>{value}</span>
              </div>
              <input type="range" min={min} max={max} value={value}
                onChange={(e)=>onChange(Number(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{background:`linear-gradient(90deg,${color} ${((value-YEAR_MIN)/(YEAR_MAX-YEAR_MIN))*100}%,rgba(17,34,64,0.8) 0%)`}}
              />
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="relative mt-4 h-4 flex items-center">
          <div className="absolute inset-x-0 h-px" style={{background:"rgba(100,255,218,0.08)"}} />
          {[2013,2015,2017,2019,2021,2023,2024].map((y) => (
            <div key={y} className="absolute flex flex-col items-center"
              style={{left:`${((y-YEAR_MIN)/(YEAR_MAX-YEAR_MIN))*100}%`}}>
              <div className="w-1 h-1 rounded-full transition-colors"
                style={{background: y>=yearFrom&&y<=yearTo ? "#64FFDA" : "rgba(17,34,64,0.9)"}} />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] font-mono" style={{color:"rgba(136,146,176,0.35)"}}>2013</span>
          <span className="text-[9px] font-mono" style={{color:"rgba(136,146,176,0.35)"}}>2024</span>
        </div>
      </div>

      {/* ── Detection Mode ── */}
      <div className="p-5 border-b" style={{borderColor:"rgba(100,255,218,0.06)"}}>
        <SectionLabel>Detection Mode</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {[
            {id:"basic",    label:"Basic",    sub:"Image diff"},
            {id:"advanced", label:"Advanced", sub:"AI / U-Net"},
          ].map((m) => (
            <button key={m.id} onClick={()=>setMode(m.id)}
              className="p-3 rounded-xl text-left transition-all duration-200 border"
              style={{
                background:  mode===m.id ? "rgba(100,255,218,0.08)" : "rgba(10,25,47,0.6)",
                borderColor: mode===m.id ? "rgba(100,255,218,0.35)" : "rgba(100,255,218,0.08)",
              }}>
              <div className="text-xs font-semibold"
                style={{color: mode===m.id ? "#64FFDA" : "rgba(204,214,246,0.6)"}}>{m.label}</div>
              <div className="text-[10px] font-mono mt-0.5"
                style={{color:"rgba(136,146,176,0.4)"}}>{m.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Run Button ── */}
      <div className="p-5">
        <motion.button onClick={runAnalysis} disabled={loading||!location}
          whileHover={{scale:1.02}} whileTap={{scale:0.97}}
          className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: loading ? "rgba(100,255,218,0.1)" : "linear-gradient(135deg,#64FFDA,#3DBFA3)",
            color: loading ? "#64FFDA" : "#0A192F",
            border: loading ? "1px solid rgba(100,255,218,0.3)" : "none",
            boxShadow: loading ? "none" : "0 4px 20px rgba(100,255,218,0.25)",
            fontFamily: "Sansation, Segoe UI, sans-serif",
          }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                style={{borderColor:"rgba(100,255,218,0.4)",borderTopColor:"#64FFDA"}} />
              <span className="text-xs truncate">{loadingStep||"Processing..."}</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>🚀</span> Run Analysis
            </span>
          )}
        </motion.button>
      </div>

      {/* ── Quick Results ── */}
      {analysisComplete && result && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
          className="mx-5 mb-5 rounded-xl p-4 border"
          style={{background:"rgba(10,25,47,0.7)",borderColor:"rgba(100,255,218,0.1)"}}>
          <p className="section-label mb-3">Results Summary</p>
          <div className="space-y-2">
            {[
              {label:"Urban change",  val:`${result.urban_pct?.toFixed(1)}%`,      c:"#64FFDA"},
              {label:"Veg loss",      val:`${result.vegetation_pct?.toFixed(1)}%`, c:"#FF6B6B"},
              {label:"NDVI delta",    val:`${(result.ndvi_delta*100)?.toFixed(1)}%`,c: result.ndvi_delta<0?"#FF6B6B":"#64FFDA"},
              {label:"Change area",   val:`${result.change_pct?.toFixed(1)}%`,     c:"#CCD6F6"},
            ].map((item)=>(
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-xs" style={{color:"rgba(136,146,176,0.6)"}}>{item.label}</span>
                <span className="text-xs font-bold font-mono" style={{color:item.c}}>{item.val}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Footer */}
      <div className="mt-auto p-5 border-t" style={{borderColor:"rgba(100,255,218,0.05)"}}>
        <p className="text-[10px] font-mono" style={{color:"rgba(136,146,176,0.3)"}}>
          NASA GIBS · OpenStreetMap · Nominatim
        </p>
      </div>
    </div>
  );
}
