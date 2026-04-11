import React, { useState } from "react";
import { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import MapView from "./components/MapView";
import ControlPanel from "./components/ControlPanel";
import InsightsDashboard from "./components/InsightsDashboard";
import ComparisonViewer from "./components/ComparisonViewer";
import Header from "./components/Header";
import AlertBanner from "./components/AlertBanner";
import { AnalysisProvider } from "./context/AnalysisContext";

export default function App() {
  const [activeTab, setActiveTab] = useState("map"); // map | insights | compare

  return (
    <AnalysisProvider>
      <div className="min-h-screen bg-dark-900 flex flex-col overflow-hidden">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#0f1629",
              color: "#e2e8f0",
              border: "1px solid #00d4ff44",
              borderRadius: "12px",
            },
          }}
        />

        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
        <AlertBanner />

        <main className="flex-1 flex overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === "map" && (
              <motion.div
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex overflow-hidden"
              >
                {/* Left control panel */}
                <div className="w-80 flex-shrink-0 overflow-y-auto panel-scroll border-r border-white/5">
                  <ControlPanel />
                </div>
                {/* Map */}
                <div className="flex-1 relative">
                  <MapView />
                </div>
              </motion.div>
            )}

            {activeTab === "insights" && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex-1 overflow-y-auto panel-scroll p-6"
              >
                <InsightsDashboard />
              </motion.div>
            )}

            {activeTab === "compare" && (
              <motion.div
                key="compare"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex-1 overflow-hidden"
              >
                <ComparisonViewer />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </AnalysisProvider>
  );
}
