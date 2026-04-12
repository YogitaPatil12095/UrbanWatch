import React from "react";
import { motion } from "framer-motion";
import { useAnalysis } from "../context/AnalysisContext";

export default function RealDataPanel() {
  const { realStats } = useAnalysis();
  if (!realStats) return null;

  const { buildings_count, roads_count, area_km2, ndvi_from, ndvi_to,
          ndvi_delta, ndvi_source, urban_density_per_km2,
          vegetation_features, data_sources, confidence, interpretation } = realStats;

  const ndviColor = ndvi_delta < -0.05 ? "#ff006e" : ndvi_delta > 0.02 ? "#00ff88" : "#ffd700";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 border border-neon-green/20 mt-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-mono font-semibold text-neon-green">
            ✅ Verified Real-World Data
          </h3>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            Sources: {data_sources?.join(" · ")}
          </p>
        </div>
        <span className={`text-[10px] font-mono px-2 py-1 rounded-full border ${
          confidence === "medium"
            ? "border-neon-blue/40 text-neon-blue bg-neon-blue/10"
            : "border-yellow-500/40 text-yellow-400 bg-yellow-500/10"
        }`}>
          {confidence} confidence
        </span>
      </div>

      {/* Real stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Buildings", value: buildings_count?.toLocaleString(), icon: "🏢", color: "#00d4ff", note: "from OpenStreetMap" },
          { label: "Roads", value: roads_count?.toLocaleString(), icon: "🛣️", color: "#a78bfa", note: "from OpenStreetMap" },
          { label: "Urban Density", value: `${urban_density_per_km2}/km²`, icon: "📐", color: "#ffd700", note: "buildings+roads" },
          { label: "Green Features", value: vegetation_features?.toLocaleString(), icon: "🌳", color: "#00ff88", note: "from OpenStreetMap" },
        ].map((item, i) => (
          <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-lg mb-1">{item.icon}</div>
            <div className="text-lg font-bold font-mono" style={{ color: item.color }}>
              {item.value}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">{item.label}</div>
            <div className="text-[9px] text-slate-600 font-mono">{item.note}</div>
          </div>
        ))}
      </div>

      {/* NDVI real values */}
      <div className="bg-white/5 rounded-xl p-3 border border-white/5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-slate-400">NASA MODIS NDVI (Vegetation Index)</span>
          <span className="text-[10px] font-mono text-slate-600">{ndvi_source}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-lg font-bold font-mono text-neon-blue">{ndvi_from?.toFixed(3)}</div>
            <div className="text-[10px] text-slate-500 font-mono">Before</div>
          </div>
          <div className="flex-1 h-2 rounded-full bg-dark-500 relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all"
              style={{
                width: `${Math.abs(ndvi_delta || 0) * 500}%`,
                background: ndviColor,
                maxWidth: "100%",
              }}
            />
          </div>
          <div className="text-center">
            <div className="text-lg font-bold font-mono text-neon-pink">{ndvi_to?.toFixed(3)}</div>
            <div className="text-[10px] text-slate-500 font-mono">After</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold font-mono" style={{ color: ndviColor }}>
              {ndvi_delta > 0 ? "+" : ""}{(ndvi_delta * 100)?.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Change</div>
          </div>
        </div>
      </div>

      {/* Plain language interpretation */}
      {interpretation?.summary?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">What this means</p>
          {interpretation.summary.map((msg, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-300 font-mono">
              <span className="text-neon-green mt-0.5">→</span>
              <span>{msg}</span>
            </div>
          ))}
          <p className="text-[9px] text-slate-600 font-mono mt-2">
            ⚠️ {interpretation.data_note}
          </p>
        </div>
      )}
    </motion.div>
  );
}
