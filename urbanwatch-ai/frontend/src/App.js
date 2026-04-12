import React, { useState } from "react";
import { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import MapView from "./components/MapView";
import ControlPanel from "./components/ControlPanel";
import InsightsDashboard from "./components/InsightsDashboard";
import ComparisonViewer from "./components/ComparisonViewer";
import AlertBanner from "./components/AlertBanner";
import { AnalysisProvider } from "./context/AnalysisContext";
import { useAnalysis } from "./context/AnalysisContext";

function FloatingPanel() {
  const [open, setOpen] = useState(true);
  const { analysisComplete, result } = useAnalysis();

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[600]" style={{width:"min(860px,95vw)"}}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}}
            transition={{type:"spring",damping:25,stiffness:200}}
            className="rounded-2xl overflow-hidden shadow-2xl"
            style={{background:"rgba(6,15,30,0.95)",border:"1px solid rgba(100,255,218,0.12)",backdropFilter:"blur(16px)"}}>
            <ControlPanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <div className="flex justify-center mt-2">
        <button onClick={() => setOpen(v => !v)}
          className="px-4 py-1.5 rounded-full text-xs font-mono transition-all"
          style={{
            background:"rgba(6,15,30,0.9)",
            border:"1px solid rgba(100,255,218,0.15)",
            color:"rgba(100,255,218,0.7)",
            backdropFilter:"blur(8px)",
          }}>
          {open ? "▼ Hide Controls" : "▲ Show Controls"}
        </button>
      </div>
    </div>
  );
}

function AppShell() {
  const [activeTab, setActiveTab] = useState("map");
  const { analysisComplete, loading, location, yearFrom, yearTo, result } = useAnalysis();

  const tabs = [
    { id: "map",      label: "Map View",  icon: "" },
    { id: "insights", label: "Insights",  icon: "", locked: !analysisComplete },
    { id: "compare",  label: "Compare",   icon: "", locked: !analysisComplete },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{background:"#0A192F"}}>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: "#112240", color: "#CCD6F6",
          border: "1px solid rgba(100,255,218,0.2)",
          borderRadius: "10px", fontSize: "13px",
          fontFamily: "Sansation, Segoe UI, sans-serif",
        },
      }} />

      {/* ── Top Navigation Bar ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 h-14 border-b"
        style={{background:"#060F1E",borderColor:"rgba(100,255,218,0.08)"}}>

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
            style={{background:"linear-gradient(135deg,rgba(100,255,218,0.2),rgba(100,255,218,0.05))",border:"1px solid rgba(100,255,218,0.3)"}}>
            ◉
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide gradient-text">UrbanWatch AI</h1>
            <p className="text-[10px] font-mono" style={{color:"rgba(136,146,176,0.6)"}}>Satellite Change Detection</p>
          </div>

          {/* Active location breadcrumb */}
          {location && (
            <>
              <div className="w-px h-6 mx-2" style={{background:"rgba(100,255,218,0.1)"}} />
              <div className="flex items-center gap-2 text-xs font-mono" style={{color:"rgba(136,146,176,0.7)"}}>
                <span style={{color:"#64FFDA"}}>+</span>
                <span>{location.name?.split(",")[0]}</span>
                <span style={{color:"rgba(100,255,218,0.3)"}}>·</span>
                <span style={{color:"#64FFDA"}}>{yearFrom}</span>
                <span style={{color:"rgba(136,146,176,0.4)"}}>→</span>
                <span style={{color:"#CCD6F6"}}>{yearTo}</span>
              </div>
            </>
          )}
        </div>

        {/* Center tabs */}
        <nav className="flex items-center gap-1 rounded-xl p-1"
          style={{background:"rgba(10,25,47,0.8)",border:"1px solid rgba(100,255,218,0.08)"}}>
          {tabs.map((tab) => (
            <button key={tab.id}
              onClick={() => !tab.locked && setActiveTab(tab.id)}
              disabled={tab.locked}
              className="relative px-5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 disabled:opacity-25 disabled:cursor-not-allowed"
              style={{color: activeTab === tab.id ? "#0A192F" : "rgba(136,146,176,0.8)"}}>
              {activeTab === tab.id && (
                <motion.div layoutId="nav-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{background:"linear-gradient(135deg,#64FFDA,#3DBFA3)"}}
                  transition={{ type:"spring", bounce:0.15, duration:0.35 }}
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Right status */}
        <div className="flex items-center gap-3">
          {loading && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}}
              className="flex items-center gap-2 text-xs font-mono" style={{color:"#64FFDA"}}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:"#64FFDA"}} />
              Analyzing...
            </motion.div>
          )}
          {analysisComplete && !loading && (
            <div className="flex items-center gap-2 text-xs font-mono" style={{color:"#64FFDA"}}>
              <div className="w-1.5 h-1.5 rounded-full" style={{background:"#64FFDA"}} />
              Analysis Ready
            </div>
          )}
          {result && (
            <div className="px-2.5 py-1 rounded-lg text-xs font-mono"
              style={{
                background: result.risk_level === "Low" ? "rgba(100,255,218,0.08)" : result.risk_level === "Moderate" ? "rgba(255,193,7,0.08)" : "rgba(255,107,107,0.08)",
                border: `1px solid ${result.risk_level === "Low" ? "rgba(100,255,218,0.2)" : result.risk_level === "Moderate" ? "rgba(255,193,7,0.2)" : "rgba(255,107,107,0.2)"}`,
                color: result.risk_level === "Low" ? "#64FFDA" : result.risk_level === "Moderate" ? "#ffc107" : "#FF6B6B",
              }}>
              {result.risk_level} Risk
            </div>
          )}
        </div>
      </header>

      {/* Alert strip */}
      <AlertBanner />

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-hidden relative">

        {/* Content area — full width */}
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">

            {activeTab === "map" && (
              <motion.div key="map"
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                transition={{duration:0.2}}
                className="absolute inset-0">
                <MapView />
              </motion.div>
            )}

            {activeTab === "insights" && (
              <motion.div key="insights"
                initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}}
                transition={{duration:0.25}}
                className="absolute inset-0 overflow-y-auto panel-scroll"
                style={{background:"#0A192F"}}>
                <div className="p-6 max-w-5xl mx-auto">
                  <InsightsDashboard />
                </div>
              </motion.div>
            )}

            {activeTab === "compare" && (
              <motion.div key="compare"
                initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}}
                transition={{duration:0.25}}
                className="absolute inset-0"
                style={{background:"#0A192F"}}>
                <ComparisonViewer />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Floating bottom control panel — only on map tab */}
        {activeTab === "map" && (
          <FloatingPanel />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AnalysisProvider>
      <AppShell />
    </AnalysisProvider>
  );
}
