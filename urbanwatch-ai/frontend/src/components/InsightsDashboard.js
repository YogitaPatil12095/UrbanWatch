import React from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useAnalysis } from "../context/AnalysisContext";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const C = {
  teal:  "#64FFDA",
  coral: "#FF6B6B",
  lav:   "#CCD6F6",
  dim:   "rgba(136,146,176,0.5)",
  card:  "rgba(17,34,64,0.8)",
  border:"rgba(100,255,218,0.1)",
};

function DataCard({ label, value, unit, color, source, note, index }) {
  return (
    <motion.div custom={index}
      initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
      transition={{delay:index*0.07}}
      className="rounded-xl p-4 border"
      style={{background:C.card,borderColor:C.border}}>
      <div className="text-2xl font-bold font-mono mb-1" style={{color}}>
        {value}<span className="text-sm font-normal ml-1" style={{color:C.dim}}>{unit}</span>
      </div>
      <div className="text-xs font-semibold mb-1" style={{color:C.lav}}>{label}</div>
      {source && <div className="text-[10px] font-mono" style={{color:C.dim}}>{source}</div>}
      {note && <div className="text-[10px] mt-1" style={{color:C.dim}}>{note}</div>}
    </motion.div>
  );
}

function SectionTitle({ children, badge }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h3 className="text-sm font-semibold" style={{color:C.lav}}>{children}</h3>
      {badge && (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
          style={{background:"rgba(100,255,218,0.08)",color:C.teal,border:`1px solid rgba(100,255,218,0.2)`}}>
          {badge}
        </span>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs font-mono"
      style={{background:"#112240",border:`1px solid ${C.border}`}}>
      <p style={{color:C.dim}} className="mb-1">{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{color:p.color}}>{p.name}: {typeof p.value==="number"?p.value.toFixed(2):p.value}</p>
      ))}
    </div>
  );
};

export default function InsightsDashboard() {
  const { result, realStats, analysisComplete, location, yearFrom, yearTo } = useAnalysis();

  if (!analysisComplete || !result) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto"
          style={{background:"rgba(100,255,218,0.08)",border:`1px solid ${C.border}`}}>
          <span className="text-lg font-mono" style={{color:C.teal}}>◎</span>
        </div>
        <p className="text-sm font-semibold" style={{color:C.lav}}>No analysis yet</p>
        <p className="text-xs mt-1" style={{color:C.dim}}>Run an analysis to see insights</p>
      </div>
    );
  }

  // ── Real data from NASA + OSM ──
  const ndviFrom    = realStats?.ndvi_from    ?? result.ndvi_mean_after;
  const ndviTo      = realStats?.ndvi_to      ?? result.ndvi_mean_after;
  const ndviDelta   = realStats?.ndvi_delta   ?? result.ndvi_delta;
  const ndviSource  = realStats?.ndvi_source  ?? "NASA GIBS MODIS";
  const buildings   = realStats?.buildings_count ?? 0;
  const roads       = realStats?.roads_count     ?? 0;
  const areakm2     = realStats?.area_km2        ?? 100;
  const density     = realStats?.urban_density_per_km2 ?? 0;
  const vegFeatures = realStats?.vegetation_features ?? 0;

  // NDVI trend data — real values from NASA
  const ndviTrend = [
    { year: yearFrom, ndvi: parseFloat(ndviFrom.toFixed(4)) },
    { year: yearTo,   ndvi: parseFloat(ndviTo.toFixed(4)) },
  ];

  // Land cover from K-Means (ML estimate — labeled as such)
  const landCoverData = Object.entries(result.land_cover_after || {}).map(([name, value]) => ({
    name, value: parseFloat(value.toFixed(1)),
  }));
  const COLORS = [C.teal, C.coral, "#CCD6F6", "#f59e0b", "#a78bfa"];

  const ndviPct = (ndviDelta * 100).toFixed(1);
  const ndviColor = ndviDelta < -0.05 ? C.coral : ndviDelta < 0 ? "#f59e0b" : C.teal;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between pt-2">
        <div>
          <h2 className="text-xl font-bold" style={{color:C.lav}}>
            Urban Change Analysis
          </h2>
          <p className="text-xs font-mono mt-1" style={{color:C.dim}}>
            {location?.name?.split(",").slice(0,2).join(",")}
            &nbsp;·&nbsp;
            <span style={{color:C.teal}}>{yearFrom}</span>
            <span style={{color:C.dim}}> → </span>
            <span style={{color:C.lav}}>{yearTo}</span>
          </p>
        </div>
        {/* Risk badge */}
        <div className="text-center">
          <div className="text-2xl font-bold font-mono" style={{
            color: result.risk_level==="Low" ? C.teal : result.risk_level==="Moderate" ? "#f59e0b" : C.coral
          }}>
            {result.risk_score}
          </div>
          <div className="text-[10px] font-mono px-2 py-0.5 rounded-full mt-1" style={{
            background: result.risk_level==="Low" ? "rgba(100,255,218,0.08)" : result.risk_level==="Moderate" ? "rgba(245,158,11,0.08)" : "rgba(255,107,107,0.08)",
            color: result.risk_level==="Low" ? C.teal : result.risk_level==="Moderate" ? "#f59e0b" : C.coral,
            border: `1px solid ${result.risk_level==="Low" ? "rgba(100,255,218,0.2)" : result.risk_level==="Moderate" ? "rgba(245,158,11,0.2)" : "rgba(255,107,107,0.2)"}`,
          }}>
            {result.risk_level} Risk
          </div>
        </div>
      </div>

      {/* ── Section 1: Real NASA NDVI Data ── */}
      <section>
        <SectionTitle badge="NASA MODIS Satellite">Vegetation Health (NDVI)</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <DataCard index={0} label="NDVI Before" value={ndviFrom.toFixed(4)} unit=""
            color={C.teal} source={ndviSource}
            note={`Year ${yearFrom} — peak season`} />
          <DataCard index={1} label="NDVI After" value={ndviTo.toFixed(4)} unit=""
            color={ndviColor} source={ndviSource}
            note={`Year ${yearTo} — peak season`} />
          <DataCard index={2} label="NDVI Change" value={ndviDelta > 0 ? `+${ndviPct}` : ndviPct} unit="%"
            color={ndviColor} source="Calculated"
            note={ndviDelta < -0.05 ? "Significant vegetation decline" : ndviDelta < 0 ? "Slight decline" : "Stable or improving"} />
          <DataCard index={3} label="Water Index" value={result.mndwi_mean_after?.toFixed(3) ?? "N/A"} unit=""
            color="#60a5fa" source="NASA GIBS MODIS"
            note="MNDWI — water body presence" />
        </div>

        {/* NDVI trend chart */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.3}}
          className="mt-4 rounded-xl p-5 border" style={{background:C.card,borderColor:C.border}}>
          <p className="text-xs font-mono mb-4" style={{color:C.dim}}>
            NDVI Trend — {yearFrom} to {yearTo} (NASA MODIS 250m)
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={ndviTrend}>
              <defs>
                <linearGradient id="ndviGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.teal} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={C.teal} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,255,218,0.06)"/>
              <XAxis dataKey="year" tick={{fill:C.dim,fontSize:11,fontFamily:"monospace"}}/>
              <YAxis tick={{fill:C.dim,fontSize:11,fontFamily:"monospace"}} domain={["auto","auto"]}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Area type="monotone" dataKey="ndvi" name="NDVI"
                stroke={C.teal} fill="url(#ndviGrad)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </section>

      {/* ── Section 2: Real OSM Data ── */}
      <section>
        <SectionTitle badge="OpenStreetMap">Urban Infrastructure</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <DataCard index={0} label="Buildings" value={buildings > 0 ? buildings.toLocaleString() : "Loading..."} unit=""
            color={C.teal} source="OpenStreetMap"
            note={`Within ${areakm2} km² area`} />
          <DataCard index={1} label="Roads" value={roads > 0 ? roads.toLocaleString() : "Loading..."} unit=""
            color={C.lav} source="OpenStreetMap"
            note="Road segments mapped" />
          <DataCard index={2} label="Urban Density" value={density > 0 ? density.toFixed(0) : "—"} unit="/km²"
            color="#f59e0b" source="Calculated"
            note="Buildings + roads per km²" />
          <DataCard index={3} label="Green Features" value={vegFeatures > 0 ? vegFeatures.toLocaleString() : "—"} unit=""
            color="#4ade80" source="OpenStreetMap"
            note="Parks, forests, grassland" />
        </div>
        {buildings === 0 && (
          <p className="text-xs font-mono mt-2" style={{color:"rgba(245,158,11,0.6)"}}>
            Note: OpenStreetMap data loading — Overpass API may be slow. Refresh insights after a moment.
          </p>
        )}
      </section>

      {/* ── Section 3: ML-based estimates (clearly labeled) ── */}
      <section>
        <SectionTitle badge="ML Estimate — not verified">Change Detection</SectionTitle>
        <p className="text-xs mb-4" style={{color:C.dim}}>
          These values are computed from 250m MODIS satellite pixel analysis. They are estimates, not ground truth.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <DataCard index={0} label="Pixel Change Detected" value={result.change_pct?.toFixed(1)} unit="%"
            color={C.lav} source="Image differencing (ML)"
            note="% of pixels that changed between years" />
          <DataCard index={1} label="Anomaly Area" value={result.anomaly_pct?.toFixed(1)} unit="%"
            color="#f59e0b" source="Z-Score analysis (ML)"
            note="Statistically unusual change" />
          <DataCard index={2} label="PCA Change" value={result.pca_change_pct?.toFixed(1)} unit="%"
            color="#a78bfa" source="PCA analysis (ML)"
            note={`PC1 explains ${result.pca_variance_explained?.[0]}% variance`} />
        </div>
      </section>

      {/* ── Section 4: Land Cover (ML) ── */}
      {landCoverData.length > 0 && (
        <section>
          <SectionTitle badge="ML Estimate">Land Cover Classification</SectionTitle>
          <p className="text-xs mb-4" style={{color:C.dim}}>
            Unsupervised K-Means clustering on satellite pixels. Approximate classification only.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[["Before", result.land_cover_before], ["After", result.land_cover_after]].map(([label, data], idx) => (
              <motion.div key={label} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
                transition={{delay:0.2+idx*0.1}}
                className="rounded-xl p-5 border" style={{background:C.card,borderColor:C.border}}>
                <p className="text-xs font-mono mb-4" style={{color:C.dim}}>
                  {label} ({idx===0?yearFrom:yearTo})
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={Object.entries(data||{}).map(([n,v])=>({name:n,value:parseFloat(v.toFixed(1))}))}
                      cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                      paddingAngle={3} dataKey="value">
                      {Object.keys(data||{}).map((_,i)=>(
                        <Cell key={i} fill={COLORS[i%COLORS.length]} stroke="transparent"/>
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Legend formatter={(v)=>(
                      <span style={{color:C.dim,fontSize:"10px",fontFamily:"monospace"}}>{v}</span>
                    )}/>
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 5: ML Output Maps ── */}
      <section>
        <SectionTitle badge="ML Output">Analysis Maps</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            {url:result.ndvi_url,   label:"NDVI Map",      note:"Vegetation index"},
            {url:result.ndbi_url,   label:"NDBI Map",      note:"Built-up index"},
            {url:result.change_map_url, label:"Change Map",note:"Detected changes"},
            {url:result.km_after_url,   label:"Land Cover", note:"K-Means classification"},
            {url:result.anomaly_url,    label:"Anomaly Map",note:"Z-Score anomalies"},
            {url:result.edge_url,       label:"Edge Map",   note:"Infrastructure edges"},
          ].filter(m=>m.url).map((m,i)=>(
            <motion.div key={i} initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
              transition={{delay:i*0.05}}
              className="rounded-xl overflow-hidden border" style={{borderColor:C.border}}>
              <img src={`${API_URL}${m.url}`} alt={m.label}
                className="w-full h-28 object-cover"
                onError={e=>{e.target.parentNode.style.display="none"}}/>
              <div className="px-3 py-2" style={{background:C.card}}>
                <p className="text-xs font-semibold" style={{color:C.lav}}>{m.label}</p>
                <p className="text-[10px] font-mono" style={{color:C.dim}}>{m.note}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Data sources footer */}
      <div className="rounded-xl p-4 border" style={{background:"rgba(10,25,47,0.5)",borderColor:C.border}}>
        <p className="text-[10px] font-mono" style={{color:C.dim}}>
          Data sources: NASA GIBS MODIS Terra (250m, real satellite) · OpenStreetMap via Overpass API (real map data) · 
          ML estimates from image analysis (approximate). NDVI = Normalized Difference Vegetation Index.
        </p>
      </div>
    </div>
  );
}
