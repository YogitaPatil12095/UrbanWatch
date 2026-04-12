import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useAnalysis } from "../context/AnalysisContext";
import RealDataPanel from "./RealDataPanel";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

function StatCard({ icon, label, value, unit, color, index, sub }) {
  return (
    <motion.div custom={index} variants={cardVariants} initial="hidden" animate="visible"
      className="glass-card p-4 border" style={{ borderColor: `${color}33` }}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xl">{icon}</span>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
      </div>
      <div className="text-2xl font-bold font-mono" style={{ color }}>
        {value}<span className="text-sm ml-1 font-normal opacity-70">{unit}</span>
      </div>
      <p className="text-xs text-slate-500 mt-0.5 font-mono">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-1 font-mono">{sub}</p>}
    </motion.div>
  );
}

function IndexImage({ url, label, description }) {
  const [expanded, setExpanded] = useState(false);
  if (!url) return null;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="glass-card border border-white/10 overflow-hidden cursor-pointer"
      onClick={() => setExpanded(!expanded)}>
      <img src={`${API_URL}${url}`} alt={label}
        className={`w-full object-cover transition-all duration-300 ${expanded ? "h-48" : "h-28"}`} />
      <div className="p-2">
        <p className="text-xs font-mono text-neon-blue">{label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>
      </div>
    </motion.div>
  );
}

function RiskGauge({ score, level }) {
  const color = level === "Critical" ? "#ff006e" : level === "High" ? "#ff6b00"
    : level === "Moderate" ? "#ffd700" : "#00ff88";
  const angle = (score / 100) * 180 - 90;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16 overflow-hidden">
        <svg viewBox="0 0 120 60" className="w-full">
          <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke="#1e2a45" strokeWidth="8" strokeLinecap="round" />
          <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={`${score * 1.57} 157`} opacity="0.8" />
          <g transform={`translate(60,55) rotate(${angle})`}>
            <line x1="0" y1="0" x2="0" y2="-38" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <circle cx="0" cy="0" r="3" fill={color} />
          </g>
        </svg>
      </div>
      <div className="text-2xl font-bold font-mono mt-1" style={{ color }}>{score}</div>
      <div className="text-xs font-mono px-3 py-1 rounded-full mt-1"
        style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
        {level} Risk
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 border border-white/10 text-xs font-mono">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}</p>
      ))}
    </div>
  );
};

export default function InsightsDashboard() {
  const { result, analysisComplete, location, yearFrom, yearTo } = useAnalysis();
  const [activeIndex, setActiveIndex] = useState("ndvi");

  if (!analysisComplete || !result) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-4xl mb-4">📊</div>
        <p className="text-slate-400 font-mono text-sm">Run an analysis to see insights</p>
      </div>
    );
  }

  const trendData = Array.from({ length: yearTo - yearFrom + 1 }, (_, i) => {
    const y = yearFrom + i;
    const p = i / Math.max(yearTo - yearFrom, 1);
    return {
      year: y,
      urban:     +(result.urban_pct * p).toFixed(1),
      vegetation:+(result.vegetation_pct * p).toFixed(1),
      anomaly:   +(result.anomaly_pct * p).toFixed(1),
    };
  });

  const landCoverData = Object.entries(result.land_cover_after || {}).map(([name, value]) => ({
    name, value,
  }));

  const COLORS = ["#00d4ff", "#00ff88", "#ff006e", "#ffd700", "#a78bfa"];

  const radarData = [
    { subject: "Urban Growth",   A: result.urban_pct,      fullMark: 50 },
    { subject: "Veg Loss",       A: result.vegetation_pct, fullMark: 50 },
    { subject: "Anomaly",        A: result.anomaly_pct,    fullMark: 50 },
    { subject: "Infra Growth",   A: Math.max(0, result.infra_growth_pct * 5), fullMark: 50 },
    { subject: "PCA Change",     A: result.pca_change_pct, fullMark: 50 },
  ];

  const indexImages = {
    ndvi:  { url: result.ndvi_url,   label: "NDVI",   desc: "Vegetation health — green = healthy, brown = sparse" },
    ndbi:  { url: result.ndbi_url,   label: "NDBI",   desc: "Built-up index — red = urban, blue = non-urban" },
    mndwi: { url: result.mndwi_url,  label: "MNDWI",  desc: "Water index — blue = water bodies" },
    km:    { url: result.km_after_url, label: "K-Means Land Cover", desc: "5-class unsupervised clustering" },
    anomaly: { url: result.anomaly_url, label: "Anomaly Map", desc: "Z-score anomalies — orange = increase, green = decrease" },
    edges: { url: result.edge_url,   label: "Infrastructure Edges", desc: "Sobel edge detection — roads & buildings" },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold gradient-text font-mono">Full ML Analysis Report</h2>
          <p className="text-sm text-slate-500 font-mono mt-1">
            📍 {location?.name} &nbsp;|&nbsp;
            <span className="text-neon-blue">{yearFrom}</span> → <span className="text-neon-pink">{yearTo}</span>
            &nbsp;|&nbsp; Mode: <span className="text-neon-green">{result.detection_mode}</span>
          </p>
        </div>
        <RiskGauge score={result.risk_score} level={result.risk_level} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard index={0} icon="🏙️" label="Urban Expansion" value={result.urban_pct.toFixed(1)} unit="%" color="#00d4ff" />
        <StatCard index={1} icon="🌿" label="Vegetation Loss" value={result.vegetation_pct.toFixed(1)} unit="%" color="#ff006e" />
        <StatCard index={2} icon="⚠️" label="Anomaly Area" value={result.anomaly_pct.toFixed(1)} unit="%" color="#ffd700"
          sub={`+${result.increase_pct.toFixed(1)}% increase / -${result.decrease_pct.toFixed(1)}% decrease`} />
        <StatCard index={3} icon="🏗️" label="Infra Growth" value={result.infra_growth_pct > 0 ? "+" + result.infra_growth_pct.toFixed(1) : result.infra_growth_pct.toFixed(1)} unit="%" color="#a78bfa" />
      </div>

      {/* Real verified data panel */}
      <RealDataPanel />

      {/* Spectral indices row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard index={4} icon="🌱" label="NDVI (after)" value={result.ndvi_mean_after.toFixed(3)} unit=""
          color="#00ff88" sub={`Δ ${result.ndvi_delta > 0 ? "+" : ""}${(result.ndvi_delta).toFixed(3)}`} />
        <StatCard index={5} icon="🏢" label="NDBI (after)" value={result.ndbi_mean_after.toFixed(3)} unit="" color="#00d4ff" />
        <StatCard index={6} icon="💧" label="MNDWI (after)" value={result.mndwi_mean_after.toFixed(3)} unit="" color="#60a5fa" />
        <StatCard index={7} icon="📐" label="PCA Change" value={result.pca_change_pct.toFixed(1)} unit="%"
          color="#f472b6" sub={`PC1 explains ${result.pca_variance_explained?.[0]}% variance`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-2 glass-card p-5 border border-white/10">
          <h3 className="text-sm font-mono text-slate-400 mb-4">Change Trends Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData}>
              <defs>
                {[["urbanGrad","#00d4ff"],["vegGrad","#ff006e"],["anomGrad","#ffd700"]].map(([id,c]) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={c} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a45" />
              <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="urban" name="Urban %" stroke="#00d4ff" fill="url(#urbanGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="vegetation" name="Veg Loss %" stroke="#ff006e" fill="url(#vegGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="anomaly" name="Anomaly %" stroke="#ffd700" fill="url(#anomGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Radar chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card p-5 border border-white/10">
          <h3 className="text-sm font-mono text-slate-400 mb-4">Change Profile</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e2a45" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }} />
              <Radar name="Change" dataKey="A" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Land cover comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[["Before", result.land_cover_before], ["After", result.land_cover_after]].map(([label, data], idx) => (
          <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + idx * 0.1 }} className="glass-card p-5 border border-white/10">
            <h3 className="text-sm font-mono text-slate-400 mb-4">
              Land Cover — <span className={idx === 0 ? "text-neon-blue" : "text-neon-pink"}>{label} ({idx === 0 ? yearFrom : yearTo})</span>
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={Object.entries(data || {}).map(([n, v]) => ({ name: n, value: v }))}
                  cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {Object.keys(data || {}).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: "10px", fontFamily: "monospace" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        ))}
      </div>

      {/* Spectral index images */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="glass-card p-5 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-mono text-slate-400">ML Output Maps</h3>
          <div className="flex gap-1 flex-wrap">
            {Object.keys(indexImages).map((k) => (
              <button key={k} onClick={() => setActiveIndex(k)}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                  activeIndex === k ? "bg-neon-blue/20 border-neon-blue/40 text-neon-blue"
                    : "border-white/10 text-slate-500 hover:text-slate-300"}`}>
                {indexImages[k].label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(indexImages).filter(([k]) => k === activeIndex || true).slice(0, 6).map(([k, v]) => (
            <IndexImage key={k} url={v.url} label={v.label} description={v.desc} />
          ))}
        </div>
      </motion.div>

      {/* PCA variance explained */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        className="glass-card p-4 border border-white/5">
        <h3 className="text-xs font-mono text-slate-500 mb-3 uppercase tracking-wider">PCA Variance Explained</h3>
        <div className="flex gap-3">
          {(result.pca_variance_explained || []).map((v, i) => (
            <div key={i} className="flex-1">
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-slate-500">PC{i + 1}</span>
                <span className="text-neon-blue">{v.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-dark-500 overflow-hidden">
                <div className="h-full rounded-full bg-neon-blue/60" style={{ width: `${v}%` }} />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Metadata footer */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="glass-card p-4 border border-white/5 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
        {[
          { label: "Detection Mode", value: result.detection_mode },
          { label: "Infra Density Before", value: `${result.infra_density_before?.toFixed(1)}%` },
          { label: "Infra Density After",  value: `${result.infra_density_after?.toFixed(1)}%` },
          { label: "PCA Change",           value: `${result.pca_change_pct?.toFixed(1)}%` },
          { label: "Risk Score",           value: `${result.risk_score}/100` },
        ].map((item, i) => (
          <div key={i}>
            <p className="text-[10px] text-slate-600 font-mono">{item.label}</p>
            <p className="text-sm font-mono text-neon-blue mt-1">{item.value}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
