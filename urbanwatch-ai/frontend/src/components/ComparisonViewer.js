import React, { useState } from "react";
import { motion } from "framer-motion";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";
import { useAnalysis } from "../context/AnalysisContext";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function Placeholder({ year, label }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center"
      style={{background:"#060F1E"}}>
      <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`g${year}`} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#64FFDA" strokeWidth="0.4"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#g${year})`}/>
      </svg>
      <div className="w-8 h-8 rounded-full flex items-center justify-center mb-3 relative z-10"
        style={{background:"rgba(100,255,218,0.1)",border:"1px solid rgba(100,255,218,0.2)"}}>
        <span className="text-sm font-mono" style={{color:"#64FFDA"}}>◎</span>
      </div>
      <p className="text-sm font-mono relative z-10" style={{color:"rgba(100,255,218,0.6)"}}>{label}</p>
      <p className="text-xs font-mono mt-1 relative z-10" style={{color:"rgba(136,146,176,0.4)"}}>
        Satellite imagery from NASA GIBS
      </p>
    </div>
  );
}

function Label({ children, side = "left" }) {
  return (
    <div className={`absolute top-4 ${side === "left" ? "left-4" : "right-4"} z-10 px-3 py-1.5 rounded-lg`}
      style={{background:"rgba(6,15,30,0.85)",border:"1px solid rgba(100,255,218,0.2)",backdropFilter:"blur(8px)"}}>
      <span className="text-xs font-mono" style={{color:"#64FFDA"}}>{children}</span>
    </div>
  );
}

export default function ComparisonViewer() {
  const { imageFrom, imageTo, changeMap, analysisComplete, location, yearFrom, yearTo } = useAnalysis();
  const [viewMode, setViewMode] = useState("slider");

  if (!analysisComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8"
        style={{background:"#0A192F"}}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
          style={{background:"rgba(100,255,218,0.08)",border:"1px solid rgba(100,255,218,0.15)"}}>
          <span className="text-lg font-mono" style={{color:"#64FFDA"}}>◎</span>
        </div>
        <p className="text-sm font-semibold" style={{color:"#CCD6F6"}}>No analysis yet</p>
        <p className="text-xs mt-2" style={{color:"rgba(136,146,176,0.5)"}}>
          Run an analysis to compare satellite images
        </p>
      </div>
    );
  }

  // Prepend API_URL to all image paths
  const beforeUrl = imageFrom ? `${API_URL}${imageFrom}` : null;
  const afterUrl  = imageTo   ? `${API_URL}${imageTo}`   : null;
  const changeUrl = changeMap ? `${API_URL}${changeMap}` : null;

  const modes = [
    { id: "slider",     label: "Slider",       icon: "↔" },
    { id: "sidebyside", label: "Side by Side",  icon: "||" },
    { id: "overlay",    label: "Change Map",    icon: "+" },
  ];

  return (
    <div className="flex flex-col h-full" style={{background:"#0A192F"}}>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b"
        style={{background:"#060F1E",borderColor:"rgba(100,255,218,0.08)"}}>
        <div>
          <h2 className="text-sm font-semibold" style={{color:"#CCD6F6"}}>
            Before / After Comparison
          </h2>
          <p className="text-xs font-mono mt-0.5" style={{color:"rgba(136,146,176,0.5)"}}>
            {location?.name?.split(",")[0]} &nbsp;·&nbsp;
            <span style={{color:"#64FFDA"}}>{yearFrom}</span>
            <span style={{color:"rgba(136,146,176,0.4)"}}> → </span>
            <span style={{color:"#CCD6F6"}}>{yearTo}</span>
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 rounded-xl p-1"
          style={{background:"rgba(10,25,47,0.8)",border:"1px solid rgba(100,255,218,0.08)"}}>
          {modes.map((m) => (
            <button key={m.id} onClick={() => setViewMode(m.id)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background:  viewMode === m.id ? "linear-gradient(135deg,#64FFDA,#3DBFA3)" : "transparent",
                color:       viewMode === m.id ? "#0A192F" : "rgba(136,146,176,0.7)",
              }}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 overflow-hidden relative">

        {/* ── Slider ── */}
        {viewMode === "slider" && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} className="w-full h-full">
            {beforeUrl && afterUrl ? (
              <ReactCompareSlider style={{width:"100%",height:"100%"}}
                itemOne={
                  <div className="relative w-full h-full">
                    <ReactCompareSliderImage src={beforeUrl} alt={`${yearFrom}`}
                      style={{objectFit:"cover",width:"100%",height:"100%"}} />
                    <Label side="left">{yearFrom} — Before</Label>
                  </div>
                }
                itemTwo={
                  <div className="relative w-full h-full">
                    <ReactCompareSliderImage src={afterUrl} alt={`${yearTo}`}
                      style={{objectFit:"cover",width:"100%",height:"100%"}} />
                    <Label side="right">{yearTo} — After</Label>
                  </div>
                }
              />
            ) : (
              <ReactCompareSlider style={{width:"100%",height:"100%"}}
                itemOne={<Placeholder year={yearFrom} label={`${yearFrom} — Before`} />}
                itemTwo={<Placeholder year={yearTo}   label={`${yearTo} — After`} />}
              />
            )}
          </motion.div>
        )}

        {/* ── Side by Side ── */}
        {viewMode === "sidebyside" && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}
            className="grid grid-cols-2 h-full" style={{gap:"2px",background:"#060F1E"}}>
            <div className="relative overflow-hidden">
              {beforeUrl
                ? <img src={beforeUrl} alt={`Before ${yearFrom}`} className="w-full h-full object-cover" />
                : <Placeholder year={yearFrom} label={`${yearFrom} — Before`} />
              }
              <Label side="left">{yearFrom} — Before</Label>
            </div>
            <div className="relative overflow-hidden">
              {afterUrl
                ? <img src={afterUrl} alt={`After ${yearTo}`} className="w-full h-full object-cover" />
                : <Placeholder year={yearTo} label={`${yearTo} — After`} />
              }
              <Label side="right">{yearTo} — After</Label>
            </div>
          </motion.div>
        )}

        {/* ── Change Map Overlay ── */}
        {viewMode === "overlay" && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}
            className="relative w-full h-full">
            {/* Base: after image */}
            {afterUrl
              ? <img src={afterUrl} alt="Base satellite" className="w-full h-full object-cover" />
              : <Placeholder year={yearTo} label={`${yearTo} — After`} />
            }
            {/* Change map overlay */}
            {changeUrl && (
              <img src={changeUrl} alt="Change detection"
                className="absolute inset-0 w-full h-full object-cover"
                style={{mixBlendMode:"screen",opacity:0.75}}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            )}
            {/* Fallback synthetic overlay if no change map */}
            {!changeUrl && (
              <div className="absolute inset-0" style={{
                background:"radial-gradient(ellipse at 40% 50%,rgba(255,107,107,0.25) 0%,transparent 55%),radial-gradient(ellipse at 70% 30%,rgba(100,255,218,0.15) 0%,transparent 45%)"
              }} />
            )}

            <Label side="left">Change Detection Overlay</Label>

            {/* Legend */}
            <div className="absolute bottom-6 left-6 px-4 py-3 rounded-xl"
              style={{background:"rgba(6,15,30,0.9)",border:"1px solid rgba(100,255,218,0.15)",backdropFilter:"blur(8px)"}}>
              <p className="text-[9px] font-mono uppercase tracking-widest mb-2"
                style={{color:"rgba(100,255,218,0.5)"}}>Change Type</p>
              {[
                {color:"#FF6B6B", label:"Urban expansion"},
                {color:"#64FFDA", label:"Infrastructure"},
                {color:"#ffc107", label:"Vegetation loss"},
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 mb-1.5 last:mb-0">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{background:item.color,opacity:0.8}} />
                  <span className="text-[10px] font-mono" style={{color:"rgba(204,214,246,0.6)"}}>{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
