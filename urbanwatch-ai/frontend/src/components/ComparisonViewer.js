import React, { useState } from "react";
import { motion } from "framer-motion";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";
import { useAnalysis } from "../context/AnalysisContext";

// Free OpenStreetMap static-like tile (we use a canvas-rendered placeholder when no real image)
function SatellitePlaceholder({ year, label, color }) {
  return (
    <div
      className="w-full h-full flex items-center justify-center relative"
      style={{
        background: `radial-gradient(ellipse at 50% 50%, #0f1629 0%, #050810 100%)`,
      }}
    >
      {/* Synthetic grid pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`grid-${year}`} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={color} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${year})`} />
      </svg>
      <div className="text-center z-10">
        <div className="text-4xl mb-2">🛰️</div>
        <p className="text-xs font-mono" style={{ color }}>{label}</p>
        <p className="text-[10px] text-slate-600 font-mono mt-1">Satellite imagery loads after analysis</p>
      </div>
    </div>
  );
}

export default function ComparisonViewer() {
  const { imageFrom, imageTo, changeMap, analysisComplete, location, yearFrom, yearTo } = useAnalysis();
  const [viewMode, setViewMode] = useState("slider"); // slider | sidebyside | overlay

  if (!analysisComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-slate-400 font-mono text-sm">Run an analysis to compare satellite images</p>
        <p className="text-slate-600 font-mono text-xs mt-2">Before/after imagery will appear here</p>
      </div>
    );
  }

  // Use real images from API backend (served as /static/images/...)
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
  const beforeUrl = imageFrom ? `${API_URL}${imageFrom}` : null;
  const afterUrl = imageTo ? `${API_URL}${imageTo}` : null;

  return (
    <div className="flex flex-col h-full">
      {/* Controls bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/5 bg-dark-800/50">
        <div>
          <h2 className="text-sm font-mono font-semibold text-slate-300">
            Before / After Comparison
          </h2>
          <p className="text-xs text-slate-500 font-mono">
            📍 {location?.name} &nbsp;|&nbsp;
            <span className="text-neon-blue">{yearFrom}</span>
            {" → "}
            <span className="text-neon-pink">{yearTo}</span>
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-dark-700/50 rounded-xl p-1 border border-white/5">
          {[
            { id: "slider", label: "Slider", icon: "↔️" },
            { id: "sidebyside", label: "Side by Side", icon: "⬜" },
            { id: "overlay", label: "Change Map", icon: "🔥" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setViewMode(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                viewMode === m.id
                  ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Viewer area */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === "slider" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full"
          >
            {beforeUrl && afterUrl ? (
              <ReactCompareSlider
                style={{ width: "100%", height: "100%" }}
                itemOne={
                  <div className="relative w-full h-full">
                    <ReactCompareSliderImage src={beforeUrl} alt={`Satellite ${yearFrom}`} style={{ objectFit: "cover" }} />
                    <div className="absolute top-4 left-4 glass-card px-3 py-1.5 border border-neon-blue/30">
                      <span className="text-xs font-mono text-neon-blue">{yearFrom} — Before</span>
                    </div>
                  </div>
                }
                itemTwo={
                  <div className="relative w-full h-full">
                    <ReactCompareSliderImage src={afterUrl} alt={`Satellite ${yearTo}`} style={{ objectFit: "cover" }} />
                    <div className="absolute top-4 right-4 glass-card px-3 py-1.5 border border-neon-pink/30">
                      <span className="text-xs font-mono text-neon-pink">{yearTo} — After</span>
                    </div>
                  </div>
                }
              />
            ) : (
              <ReactCompareSlider
                style={{ width: "100%", height: "100%" }}
                itemOne={
                  <div className="relative w-full h-full">
                    <SatellitePlaceholder year={yearFrom} label={`${yearFrom} — Before`} color="#00d4ff" />
                  </div>
                }
                itemTwo={
                  <div className="relative w-full h-full">
                    <SatellitePlaceholder year={yearTo} label={`${yearTo} — After`} color="#ff006e" />
                  </div>
                }
              />
            )}
          </motion.div>
        )}

        {viewMode === "sidebyside" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 h-full gap-1"
          >
            <div className="relative overflow-hidden">
              {beforeUrl
                ? <img src={beforeUrl} alt={`Before ${yearFrom}`} className="w-full h-full object-cover" />
                : <SatellitePlaceholder year={yearFrom} label={`${yearFrom} — Before`} color="#00d4ff" />
              }
              <div className="absolute top-4 left-4 glass-card px-3 py-1.5 border border-neon-blue/30">
                <span className="text-xs font-mono text-neon-blue">{yearFrom} — Before</span>
              </div>
            </div>
            <div className="relative overflow-hidden">
              {afterUrl
                ? <img src={afterUrl} alt={`After ${yearTo}`} className="w-full h-full object-cover" />
                : <SatellitePlaceholder year={yearTo} label={`${yearTo} — After`} color="#ff006e" />
              }
              <div className="absolute top-4 right-4 glass-card px-3 py-1.5 border border-neon-pink/30">
                <span className="text-xs font-mono text-neon-pink">{yearTo} — After</span>
              </div>
            </div>
          </motion.div>
        )}

        {viewMode === "overlay" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative w-full h-full"
          >
            {afterUrl
              ? <img src={afterUrl} alt="Base" className="w-full h-full object-cover" />
              : <SatellitePlaceholder year={yearTo} label={`${yearTo} — After`} color="#ff006e" />
            }
            {/* Change map overlay */}
            {changeMap ? (
              <img
                src={changeMap}
                alt="Change detection overlay"
                className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-70"
              />
            ) : (
              /* Synthetic overlay when no real change map */
              <div
                className="absolute inset-0"
                style={{
                  background: "radial-gradient(ellipse at 40% 50%, rgba(255,0,110,0.3) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(0,212,255,0.2) 0%, transparent 50%)",
                }}
              />
            )}
            <div className="absolute top-4 left-4 glass-card px-3 py-1.5 border border-neon-pink/30">
              <span className="text-xs font-mono text-neon-pink">Change Detection Overlay</span>
            </div>
            {/* Legend */}
            <div className="absolute bottom-6 left-6 glass-card p-3 border border-white/10">
              <p className="text-[10px] font-mono text-slate-500 mb-2">CHANGE TYPE</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-neon-pink/70" />
                  <span className="text-[10px] font-mono text-slate-400">Urban expansion</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-neon-blue/70" />
                  <span className="text-[10px] font-mono text-slate-400">Infrastructure</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-yellow-500/70" />
                  <span className="text-[10px] font-mono text-slate-400">Vegetation loss</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
