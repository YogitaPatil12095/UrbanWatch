import React, { useState } from "react";
import { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import MapView from "./components/MapView";
import ControlPanel from "./components/ControlPanel";
import InsightsDashboard from "./components/InsightsDashboard";
import ComparisonViewer from "./components/ComparisonViewer";
import TopBar from "./components/TopBar";
import AlertBanner from "./components/AlertBanner";
import { AnalysisProvider } from "./context/AnalysisContext";

export default function App() {
  const [activePanel, setActivePanel] = useState("map"); // map | insights | compare

  return (
    <AnalysisProvider>
      <div className="h-screen flex flex-col overflow-hidden" style={{background:"#0F0F1A"}}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1A1A2E",
              color: "#F5F0EB",
              border: "1px solid rgba(233,69,96,0.3)",
              borderRadius: "10px",
              fontSize: "13px",
            },
          }}
        />

        {/* Top bar */}
        <TopBar activePanel={activePanel} setActivePanel={setActivePanel} />

        {/* Alert strip */}
        <AlertBanner />

        {/* Main workspace */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left sidebar — always visible */}
          <aside className="w-72 flex-shrink-0 flex flex-col overflow-hidden border-r"
            style={{background:"#1A1A2E",borderColor:"rgba(233,69,96,0.12)"}}>
            <ControlPanel />
          </aside>

          {/* Center — map always rendered, panels overlay */}
          <main className="flex-1 relative overflow-hidden">
            {/* Map is always mounted */}
            <MapView />

            {/* Insights panel slides in over map */}
            <AnimatePresence>
              {activePanel === "insights" && (
                <motion.div
                  key="insights"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 200 }}
                  className="absolute inset-0 overflow-y-auto z-30"
                  style={{background:"rgba(15,15,26,0.97)",backdropFilter:"blur(8px)"}}
                >
                  <div className="p-6 max-w-5xl mx-auto">
                    <InsightsDashboard />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Compare panel slides in over map */}
            <AnimatePresence>
              {activePanel === "compare" && (
                <motion.div
                  key="compare"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 200 }}
                  className="absolute inset-0 z-30"
                  style={{background:"rgba(15,15,26,0.97)"}}
                >
                  <ComparisonViewer />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </AnalysisProvider>
  );
}
