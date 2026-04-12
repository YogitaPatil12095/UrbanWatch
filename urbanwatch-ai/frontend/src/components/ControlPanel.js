import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useAnalysis } from "../context/AnalysisContext";
import { geocodeLocation } from "../utils/api";

const YEAR_MIN = 2013;
const YEAR_MAX = 2024;

function SectionLabel({ children }) {
  return <p className="section-label mb-2">{children}</p>;
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
    <div className="flex flex-row items-start gap-0 overflow-x-auto panel-scroll" style={{maxHeight:"200px"}}>

      {/* Location */}
      <div className="flex-shrink-0 p-4 border-r" style={{width:"220px",borderColor:"rgba(100,255,218,0.08)"}}>
        <SectionLabel>Location</SectionLabel>
        <div className="relative">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{background:"rgba(10,25,47,0.8)",border:"1px solid rgba(100,255,218,0.15)"}}>
            <span className="text-sm font-mono" style={{color:"#64FFDA"}}>+</span>
            <input type="text" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city..."
              className="flex-1 bg-transparent text-xs outline-none"
              style={{color:"#CCD6F6",fontFamily:"Sansation, Segoe UI, sans-serif"}}
            />
            {searching && (
              <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                style={{borderColor:"rgba(100,255,218,0.3)",borderTopColor:"#64FFDA"}} />
            )}
          </div>
          {suggestions.length > 0 && (
            <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}
              className="absolute bottom-full left-0 right-0 mb-1 rounded-xl overflow-hidden z-50 shadow-2xl"
              style={{background:"#112240",border:"1px solid rgba(100,255,218,0.15)"}}>
              {suggestions.slice(0,4).map((s,i) => (
                <button key={i} onClick={() => selectLocation(s)}
                  className="w-full text-left px-3 py-2 text-xs transition-colors border-b last:border-0"
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
          <p className="text-[10px] font-mono mt-1.5" style={{color:"rgba(136,146,176,0.5)"}}>
            {location.lat.toFixed(3)}°N · {location.lon.toFixed(3)}°E
          </p>
        )}
      </div>

      {/* Time Range */}
      <div className="flex-shrink-0 p-4 border-r" style={{width:"220px",borderColor:"rgba(100,255,218,0.08)"}}>
        <SectionLabel>Time Range</SectionLabel>
        <div className="space-y-3">
          {[
            {label:"From",value:yearFrom,color:"#64FFDA",onChange:(v)=>{setYearFrom(v);if(v>=yearTo)setYearTo(v+1);},min:YEAR_MIN,max:YEAR_MAX-1},
            {label:"To",  value:yearTo,  color:"#CCD6F6",onChange:(v)=>{setYearTo(v);if(v<=yearFrom)setYearFrom(v-1);},min:YEAR_MIN+1,max:YEAR_MAX},
          ].map(({label,value,color,onChange,min,max}) => (
            <div key={label}>
              <div className="flex justify-between mb-1.5">
                <span className="text-[10px]" style={{color:"rgba(136,146,176,0.5)"}}>{label}</span>
                <span className="text-xs font-bold font-mono" style={{color}}>{value}</span>
              </div>
              <input type="range" min={min} max={max} value={value}
                onChange={(e)=>onChange(Number(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{background:`linear-gradient(90deg,${color} ${((value-YEAR_MIN)/(YEAR_MAX-YEAR_MIN))*100}%,rgba(17,34,64,0.8) 0%)`}}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Mode */}
      <div className="flex-shrink-0 p-4 border-r" style={{width:"180px",borderColor:"rgba(100,255,218,0.08)"}}>
        <SectionLabel>Mode</SectionLabel>
        <div className="space-y-2">
          {[
            {id:"basic",    label:"Basic",    sub:"Image diff"},
            {id:"advanced", label:"Advanced", sub:"AI / U-Net"},
          ].map((m) => (
            <button key={m.id} onClick={()=>setMode(m.id)}
              className="w-full p-2.5 rounded-xl text-left transition-all border"
              style={{
                background:  mode===m.id ? "rgba(100,255,218,0.08)" : "rgba(10,25,47,0.5)",
                borderColor: mode===m.id ? "rgba(100,255,218,0.3)"  : "rgba(100,255,218,0.06)",
              }}>
              <div className="text-xs font-semibold"
                style={{color:mode===m.id?"#64FFDA":"rgba(204,214,246,0.5)"}}>{m.label}</div>
              <div className="text-[9px] font-mono" style={{color:"rgba(136,146,176,0.35)"}}>{m.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Run + Summary */}
      <div className="flex-1 p-4 flex flex-col justify-between" style={{minWidth:"200px"}}>
        <motion.button onClick={runAnalysis} disabled={loading||!location}
          whileHover={{scale:1.02}} whileTap={{scale:0.97}}
          className="w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: loading ? "rgba(100,255,218,0.08)" : "linear-gradient(135deg,#64FFDA,#3DBFA3)",
            color: loading ? "#64FFDA" : "#0A192F",
            border: loading ? "1px solid rgba(100,255,218,0.2)" : "none",
            boxShadow: loading ? "none" : "0 4px 16px rgba(100,255,218,0.2)",
            fontFamily:"Sansation, Segoe UI, sans-serif",
          }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                style={{borderColor:"rgba(100,255,218,0.3)",borderTopColor:"#64FFDA"}} />
              <span className="text-xs truncate">{loadingStep||"Processing..."}</span>
            </span>
          ) : "Run Analysis"}
        </motion.button>

        {analysisComplete && result && (
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
            {[
              {l:"Urban",  v:`${result.urban_pct?.toFixed(1)}%`,       c:"#64FFDA"},
              {l:"Veg",    v:`${result.vegetation_pct?.toFixed(1)}%`,  c:"#FF6B6B"},
              {l:"NDVI",   v:`${(result.ndvi_delta*100)?.toFixed(1)}%`,c:result.ndvi_delta<0?"#FF6B6B":"#64FFDA"},
              {l:"Risk",   v:result.risk_level,                         c:result.risk_level==="Low"?"#64FFDA":result.risk_level==="Moderate"?"#ffc107":"#FF6B6B"},
            ].map(item=>(
              <div key={item.l} className="flex justify-between">
                <span className="text-[10px]" style={{color:"rgba(136,146,176,0.5)"}}>{item.l}</span>
                <span className="text-[10px] font-bold font-mono" style={{color:item.c}}>{item.v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
