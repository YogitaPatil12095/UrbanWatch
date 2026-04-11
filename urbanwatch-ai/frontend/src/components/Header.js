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
    <header className="flex-shrink-0 border-b border-white/5 bg-dark-800/80 backdrop-blur-md z-50">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-neon-blue/30 to-neon-pink/30 border border-neon-blue/40" />
            <span className="absolute inset-0 flex items-center justify-center text-lg">🛰️</span>
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text font-mono tracking-wider">
              UrbanWatch AI
            </h1>
            <p className="text-xs text-slate-500 font-mono">Satellite Change Detection</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <nav className="flex items-center gap-1 bg-dark-700/50 rounded-xl p-1 border border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={!analysisComplete && tab.id !== "map"}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id
                  ? "text-neon-blue"
                  : "text-slate-400 hover:text-slate-200"
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 rounded-lg bg-neon-blue/10 border border-neon-blue/30"
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-xs text-neon-blue font-mono"
            >
              <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
              Processing...
            </motion.div>
          )}
          {analysisComplete && !loading && (
            <div className="flex items-center gap-2 text-xs text-neon-green font-mono">
              <div className="w-2 h-2 rounded-full bg-neon-green" />
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
