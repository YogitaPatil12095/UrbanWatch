import React from "react";
import { motion } from "framer-motion";
import { useAnalysis } from "../context/AnalysisContext";

const tabs = [
  { id: "map", label: "Map View", icon: "🗺️" },
  { id: "insights", label: "Insights", icon: "📊" },
  { id: "compare", label: "Compare", icon: "🔍" },
];

export default function Header({ activeTab, setActiveTab }) {
  const { analysisComplete, loading } = useAnalysis();

  return (
    <header className="flex-shrink-0 border-b z-50" style={{borderColor:"rgba(233,69,96,0.15)",background:"rgba(26,26,46,0.85)",backdropFilter:"blur(12px)"}}>
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 rounded-lg" style={{background:"linear-gradient(135deg,rgba(233,69,96,0.25),rgba(255,107,122,0.15))",border:"1px solid rgba(233,69,96,0.4)"}} />
            <span className="absolute inset-0 flex items-center justify-center text-lg">🛰️</span>
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text font-mono tracking-wider">
              UrbanWatch AI
            </h1>
            <p className="text-xs font-mono" style={{color:"rgba(245,240,235,0.4)"}}>Satellite Change Detection</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <nav className="flex items-center gap-1 rounded-xl p-1 border" style={{background:"rgba(15,15,26,0.6)",borderColor:"rgba(233,69,96,0.2)"}}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={!analysisComplete && tab.id !== "map"}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed`}
              style={{color: activeTab === tab.id ? "#E94560" : "rgba(245,240,235,0.5)"}}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 rounded-lg"
                  style={{background:"rgba(233,69,96,0.12)",border:"1px solid rgba(233,69,96,0.35)"}}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Status indicator */}
        <div className="flex items-center gap-3">
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-xs font-mono" style={{color:"#E94560"}}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{background:"#E94560"}} />
              Processing...
            </motion.div>
          )}
          {analysisComplete && !loading && (
            <div className="flex items-center gap-2 text-xs font-mono" style={{color:"#16A085"}}>
              <div className="w-2 h-2 rounded-full" style={{background:"#16A085"}} />
              Analysis Ready
            </div>
          )}
          <div className="text-xs text-slate-600 font-mono hidden md:block">
            v1.0.0
          </div>
        </div>
      </div>
    </header>
  );
}
