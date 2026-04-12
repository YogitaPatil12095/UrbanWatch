import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnalysis } from "../context/AnalysisContext";

const alertStyles = {
  warning: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  danger:  "border-brand-accent/40 bg-brand-accent/10 text-brand-accent-l",
  info:    "border-brand-teal/40 bg-brand-teal/10 text-brand-teal",
};

export default function AlertBanner() {
  const { alerts } = useAnalysis();

  if (!alerts.length) return null;

  return (
    <div className="flex-shrink-0 px-4 py-1.5 flex gap-2 overflow-x-auto border-b"
      style={{borderColor:"rgba(100,255,218,0.06)",background:"rgba(6,15,30,0.8)"}}>
      <AnimatePresence>
        {alerts.map((alert, i) => {
          const styles = {
            warning: {border:"rgba(255,193,7,0.35)",bg:"rgba(255,193,7,0.07)",color:"#ffc107"},
            danger:  {border:"rgba(255,107,107,0.35)",bg:"rgba(255,107,107,0.07)",color:"#FF6B6B"},
            info:    {border:"rgba(100,255,218,0.35)",bg:"rgba(100,255,218,0.07)",color:"#64FFDA"},
          }[alert.type] || {};
          return (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-medium font-mono"
              style={{borderColor:styles.border,background:styles.bg,color:styles.color}}>
              <span>{alert.icon}</span>
              <span>{alert.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
