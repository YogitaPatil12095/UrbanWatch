import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useAnalysis } from "../context/AnalysisContext";
import { fetchExplanation } from "../utils/api";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const C = {
  teal:  "#64FFDA",
  coral: "#FF6B6B",
  lav:   "#CCD6F6",
  dim:   "rgba(136,146,176,0.55)",
  card:  "rgba(17,34,64,0.85)",
  border:"rgba(100,255,218,0.1)",
  navy:  "#0A192F",
};

function Card({ children, delay = 0 }) {
  return (
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
      transition={{delay}} className="rounded-xl p-5 border"
      style={{background:C.card,borderColor:C.border}}>
      {children}
    </motion.div>
  );
}

function AlgoBadge({ name }) {
  return (
    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full ml-2"
      style={{background:"rgba(100,255,218,0.08)",color:C.teal,border:`1px solid rgba(100,255,218,0.2)`}}>
      {name}
    </span>
  );
}

function SectionTitle({ children, algo }) {
  return (
    <div className="flex items-center mb-4">
      <h3 className="text-sm font-semibold" style={{color:C.lav}}>{children}</h3>
      {algo && <AlgoBadge name={algo} />}
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
        <p key={i} style={{color:p.color||C.teal}}>
          {p.name}: {typeof p.value==="number"?p.value.toFixed(4):p.value}
        </p>
      ))}
    </div>
  );
};

export default function InsightsDashboard() {
  const { result, realStats, analysisComplete, location, yearFrom, yearTo } = useAnalysis();
  const [aiExplanation, setAiExplanation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!analysisComplete || !result) return;
    setAiLoading(true);
    setAiExplanation(null);
    fetchExplanation({
      location_name: location?.name?.split(",").slice(0,2).join(",") || "Unknown",
      year_from: yearFrom,
      year_to: yearTo,
      ndvi_from:  result.ndvi_from  ?? 0.15,
      ndvi_to:    result.ndvi_to    ?? 0.12,
      ndvi_delta: result.ndvi_delta ?? -0.03,
      buildings:  realStats?.buildings_count ?? 0,
      roads:      realStats?.roads_count     ?? 0,
      area_km2:   realStats?.area_km2        ?? 100,
      change_pct: result.anomaly_pct ?? 0,
    }).then(data => { setAiExplanation(data); setAiLoading(false); })
      .catch(() => setAiLoading(false));
  }, [analysisComplete, result]);

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

  // Real NDVI data from NASA
  const ndviFrom  = result.ndvi_from  ?? 0;
  const ndviTo    = result.ndvi_to    ?? 0;
  const ndviDelta = result.ndvi_delta ?? 0;
  const ndviColor = ndviDelta < -0.05 ? C.coral : ndviDelta < 0 ? "#f59e0b" : C.teal;

  // NDVI trend from regression
  const ndviByYear = result.ndvi_by_year || {};
  const trendData = Object.entries(ndviByYear)
    .sort(([a],[b]) => Number(a)-Number(b))
    .map(([year, ndvi]) => ({ year: Number(year), ndvi: parseFloat(ndvi.toFixed(4)) }));

  // K-Means land cover
  const landAfter  = Object.entries(result.land_cover_after  || {}).map(([n,v])=>({name:n,value:parseFloat(v.toFixed(1))}));
  const landBefore = Object.entries(result.land_cover_before || {}).map(([n,v])=>({name:n,value:parseFloat(v.toFixed(1))}));
  const PIE_COLORS = [C.teal, C.coral, C.lav, "#f59e0b", "#a78bfa"];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between pt-2">
        <div>
          <h2 className="text-xl font-bold" style={{color:C.lav}}>Urban Change Analysis</h2>
          <p className="text-xs font-mono mt-1" style={{color:C.dim}}>
            {location?.name?.split(",").slice(0,2).join(",")}
            &nbsp;·&nbsp;
            <span style={{color:C.teal}}>{yearFrom}</span>
            <span style={{color:C.dim}}> → </span>
            <span style={{color:C.lav}}>{yearTo}</span>
            &nbsp;·&nbsp; NASA GIBS MODIS 250m
          </p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono" style={{
            color: result.risk_level==="Low"?C.teal:result.risk_level==="Moderate"?"#f59e0b":C.coral
          }}>{result.risk_score}</div>
          <div className="text-[10px] font-mono px-2 py-0.5 rounded-full mt-1" style={{
            background: result.risk_level==="Low"?"rgba(100,255,218,0.08)":result.risk_level==="Moderate"?"rgba(245,158,11,0.08)":"rgba(255,107,107,0.08)",
            color: result.risk_level==="Low"?C.teal:result.risk_level==="Moderate"?"#f59e0b":C.coral,
            border:`1px solid ${result.risk_level==="Low"?"rgba(100,255,218,0.2)":result.risk_level==="Moderate"?"rgba(245,158,11,0.2)":"rgba(255,107,107,0.2)"}`,
          }}>{result.risk_level} Risk</div>
        </div>
      </div>

      {/* ── Gemini AI Explanation ── */}
      <Card delay={0.05}>
        <SectionTitle algo="Gemini AI">Analysis Summary</SectionTitle>
        {aiLoading && (
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
              style={{borderColor:"rgba(100,255,218,0.3)",borderTopColor:C.teal}} />
            <span className="text-sm" style={{color:C.dim}}>Generating AI explanation...</span>
          </div>
        )}
        {!aiLoading && aiExplanation?.explanation && (
          <div>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{color:C.lav}}>
              {aiExplanation.explanation}
            </p>
            <p className="text-[10px] font-mono mt-3" style={{color:C.dim}}>
              {aiExplanation.model} · Based on NASA MODIS + OpenStreetMap real data
            </p>
          </div>
        )}
        {!aiLoading && !aiExplanation?.explanation && (
          <p className="text-sm" style={{color:C.dim}}>AI explanation unavailable.</p>
        )}
      </Card>

      {/* ── Algorithm 2: Linear Regression — NDVI Trend ── */}
      <section>
        <SectionTitle algo="Linear Regression">NDVI Trend (NASA MODIS)</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[
            {label:`NDVI ${yearFrom}`, value:ndviFrom.toFixed(4), color:C.teal,  note:"NASA MODIS"},
            {label:`NDVI ${yearTo}`,   value:ndviTo.toFixed(4),   color:ndviColor,note:"NASA MODIS"},
            {label:"NDVI Change",      value:`${ndviDelta>0?"+":""}${(ndviDelta*100).toFixed(1)}%`, color:ndviColor, note:"Real change"},
            {label:"Trend/Year",       value:`${result.regression_trend_per_year>0?"+":""}${result.regression_trend_per_year?.toFixed(3)||"—"}%`, color:C.lav, note:`R²=${result.regression_r_squared?.toFixed(3)||"—"}`},
          ].map((item,i)=>(
            <motion.div key={i} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
              transition={{delay:i*0.07}} className="rounded-xl p-4 border"
              style={{background:C.card,borderColor:C.border}}>
              <div className="text-xl font-bold font-mono" style={{color:item.color}}>{item.value}</div>
              <div className="text-xs font-semibold mt-1" style={{color:C.lav}}>{item.label}</div>
              <div className="text-[10px] font-mono mt-0.5" style={{color:C.dim}}>{item.note}</div>
            </motion.div>
          ))}
        </div>

        {trendData.length >= 2 && (
          <Card delay={0.2}>
            <p className="text-xs font-mono mb-4" style={{color:C.dim}}>
              NDVI over time — {result.regression_trend || "trend"} (slope: {result.regression_slope?.toFixed(5)||"—"}/year)
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,255,218,0.06)"/>
                <XAxis dataKey="year" tick={{fill:C.dim,fontSize:11,fontFamily:"monospace"}}/>
                <YAxis tick={{fill:C.dim,fontSize:11,fontFamily:"monospace"}} domain={["auto","auto"]}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Line type="monotone" dataKey="ndvi" name="NDVI"
                  stroke={C.teal} strokeWidth={2} dot={{fill:C.teal,r:4}}/>
              </LineChart>
            </ResponsiveContainer>
            {result.regression_prediction?.year && (
              <p className="text-xs font-mono mt-3" style={{color:C.dim}}>
                Predicted NDVI {result.regression_prediction.year}: {result.regression_prediction.ndvi?.toFixed(4)}
              </p>
            )}
          </Card>
        )}
      </section>

      {/* ── Algorithm 1: K-Means Clustering ── */}
      <section>
        <SectionTitle algo="K-Means Clustering (k=4)">Land Cover Classification</SectionTitle>
        <p className="text-xs mb-4" style={{color:C.dim}}>
          Partition-based clustering on satellite pixels. Each pixel assigned to nearest centroid.
          {result.kmeans_iterations && ` Converged in ${result.kmeans_iterations} iterations.`}
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[["Before", yearFrom, landBefore, result.km_before_url],
            ["After",  yearTo,  landAfter,  result.km_after_url]].map(([label,yr,data,url],idx)=>(
            <Card key={label} delay={0.1+idx*0.1}>
              <p className="text-xs font-mono mb-3" style={{color:C.dim}}>{label} ({yr})</p>
              <div className="flex gap-4">
                {url && (
                  <img src={`${API_URL}${url}`} alt={`K-Means ${label}`}
                    className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                    onError={e=>{e.target.style.display="none"}}/>
                )}
                <div className="flex-1">
                  {data.map((item,i)=>(
                    <div key={i} className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                        <span className="text-xs" style={{color:C.dim}}>{item.name}</span>
                      </div>
                      <span className="text-xs font-bold font-mono" style={{color:PIE_COLORS[i%PIE_COLORS.length]}}>
                        {item.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Algorithm 3: Anomaly Detection ── */}
      <section>
        <SectionTitle algo="Anomaly Detection (2σ)">Statistical Change Detection</SectionTitle>
        <p className="text-xs mb-4" style={{color:C.dim}}>
          Pixels flagged where change exceeds 2 standard deviations from mean. Teal = decrease, Coral = increase.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card delay={0.1}>
            <div className="text-2xl font-bold font-mono" style={{color:"#f59e0b"}}>{result.anomaly_pct}%</div>
            <div className="text-xs font-semibold mt-1" style={{color:C.lav}}>Anomalous Area</div>
            <div className="text-[10px] font-mono mt-1" style={{color:C.dim}}>{result.anomaly_interp}</div>
          </Card>
          <Card delay={0.15}>
            <div className="text-2xl font-bold font-mono" style={{color:C.coral}}>{result.increase_pct}%</div>
            <div className="text-xs font-semibold mt-1" style={{color:C.lav}}>Brightness Increase</div>
            <div className="text-[10px] font-mono mt-1" style={{color:C.dim}}>Urban/built-up expansion</div>
          </Card>
          <Card delay={0.2}>
            <div className="text-2xl font-bold font-mono" style={{color:C.teal}}>{result.decrease_pct}%</div>
            <div className="text-xs font-semibold mt-1" style={{color:C.lav}}>Brightness Decrease</div>
            <div className="text-[10px] font-mono mt-1" style={{color:C.dim}}>Vegetation/water change</div>
          </Card>
        </div>
        {result.anomaly_url && (
          <Card delay={0.25}>
            <p className="text-xs font-mono mb-3" style={{color:C.dim}}>Anomaly Map — flagged pixels</p>
            <img src={`${API_URL}${result.anomaly_url}`} alt="Anomaly map"
              className="w-full rounded-lg object-cover" style={{maxHeight:"200px"}}
              onError={e=>{e.target.style.display="none"}}/>
          </Card>
        )}
      </section>

      {/* ── Real OSM Data ── */}
      {realStats && (
        <section>
          <SectionTitle>Urban Infrastructure (OpenStreetMap)</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {label:"Buildings",     value:realStats.buildings_count>0?realStats.buildings_count.toLocaleString():"Loading", color:C.teal},
              {label:"Roads",         value:realStats.roads_count>0?realStats.roads_count.toLocaleString():"Loading",         color:C.lav},
              {label:"Urban Density", value:realStats.urban_density_per_km2>0?`${realStats.urban_density_per_km2.toFixed(0)}/km²`:"—", color:"#f59e0b"},
              {label:"Area Covered",  value:`${realStats.area_km2} km²`,                                                      color:C.dim},
            ].map((item,i)=>(
              <motion.div key={i} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
                transition={{delay:i*0.07}} className="rounded-xl p-4 border"
                style={{background:C.card,borderColor:C.border}}>
                <div className="text-xl font-bold font-mono" style={{color:item.color}}>{item.value}</div>
                <div className="text-xs font-semibold mt-1" style={{color:C.lav}}>{item.label}</div>
                <div className="text-[10px] font-mono mt-0.5" style={{color:C.dim}}>OpenStreetMap</div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Satellite images */}
      <section>
        <SectionTitle>Satellite Images (NASA GIBS MODIS)</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          {[[result.image_from_url, `${yearFrom} — Before`],
            [result.image_to_url,   `${yearTo} — After`]].map(([url,label],i)=>(
            url && (
              <Card key={i} delay={i*0.1}>
                <p className="text-xs font-mono mb-2" style={{color:C.dim}}>{label}</p>
                <img src={`${API_URL}${url}`} alt={label}
                  className="w-full rounded-lg object-cover" style={{maxHeight:"200px"}}
                  onError={e=>{e.target.style.display="none"}}/>
              </Card>
            )
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="rounded-xl p-4 border" style={{background:"rgba(10,25,47,0.5)",borderColor:C.border}}>
        <p className="text-[10px] font-mono" style={{color:C.dim}}>
          Algorithms: K-Means Clustering · Linear Regression · Statistical Anomaly Detection |
          Data: NASA GIBS MODIS Terra 250m · OpenStreetMap · Gemini AI explanation
        </p>
      </div>
    </div>
  );
}
