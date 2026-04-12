import React from "react";
import { motion } from "framer-motion";
import { useAnalysis } from "../context/AnalysisContext";

const tabs = [
  { id: "map",      label: "Map",      icon: "🗺️" },
  { id: "insights", label: "Insights", icon: "📊" },
  { id: "compare",  label: "Compare",  icon: "🔍" },
];

export default function TopBar({ activePanel, setActivePanel }) {
  const { analysisComplete, loading, location, yearFrom, yearTo } = useAnalysis();

  return (
    <header className="flex-shrink-0 flex items-center justify-between px-5 h-12 border-b z-50"
      style={{background:"#1A1A2E",borderColor:"rgba(233,69,96,0.15)"}}>

      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
          style={{background:"linear-gradient(135deg,#E94560,#C73650)"}}>
          🛰️
        </div>
        <div>
          <span className="text-sm font-bold font-mono tracking-wide" style={{color:"#F5F0EB"}}>
            UrbanWatch
          </span>
          <span className="text-sm font-bold font-mono tracking-wide ml-1" style={{color:"#E94560"}}>
            AI
          </span>
        </div>
        <div className="hidden md:block w-px h-4 mx-1" style={{background:"rgba(233,69,96,0.2)"}} />
        {/* Breadcrumb */}
        {location && (
          <div className="hidden md:flex items-center gap-1 text-xs font-mono"
            style={{color:"rgba(245,240,235,0.4)"}}>
            <span>{location.name?.split(",")[0]}</span>
            <span style={{color:"rgba(233,69,96,0.5)"}}>·</span>
            <span style={{color:"#E94560"}}>{yearFrom}</span>
            <span style={{color:"rgba(245,240,235,0.3)"}}>→</span>
            <span style={{color:"#FF6B7A"}}>{yearTo}</span>
          </div>
        )}
      </div>

      {/* Center tabs */}
      <nav className="flex items-center gap-0.5 rounded-lg p-0.5"
        style={{background:"rgba(15,15,26,0.8)",border:"1px solid rgba(233,69,96,0.12)"}}>
        {tabs.map((tab) => {
          const locked = !analysisComplete && tab.id !== "map";
          return (
            <button
              key={tab.id}
              onClick={() => !locked && setActivePanel(tab.id)}
              disabled={locked}
              className="relative px-4 py-1.5 rounded-md text-xs font-mono font-medium transition-all duration-200 flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{color: activePanel === tab.id ? "#F5F0EB" : "rgba(245,240,235,0.45)"}}
            >
              {activePanel === tab.id && (
                <motion.div layoutId="topbar-active"
                  className="absolute inset-0 rounded-md"
                  style={{background:"linear-gradient(135deg,#E94560,#C73650)"}}
                  transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right status */}
      <div className="flex items-center gap-3">
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 text-xs font-mono"
            style={{color:"#E94560"}}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:"#E94560"}} />
            Analyzing...
          </motion.div>
        )}
        {analysisComplete && !loading && (
          <div className="flex items-center gap-1.5 text-xs font-mono" style={{color:"#16A085"}}>
            <div className="w-1.5 h-1.5 rounded-full" style={{background:"#16A085"}} />
            Ready
          </div>
        )}
        <div className="text-[10px] font-mono px-2 py-0.5 rounded"
          style={{background:"rgba(233,69,96,0.1)",color:"rgba(233,69,96,0.6)",border:"1px solid rgba(233,69,96,0.15)"}}>
          v1.0
        </div>
      </div>
    </header>
  );
}
