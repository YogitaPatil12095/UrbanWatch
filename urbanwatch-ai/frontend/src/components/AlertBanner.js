import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnalysis } from "../context/AnalysisContext";

const alertStyles = {
  warning: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  danger: "border-neon-pink/40 bg-neon-pink/10 text-pink-300",
  info: "border-neon-blue/40 bg-neon-blue/10 text-neon-blue",
};

export default function AlertBanner() {
  const { alerts } = useAnalysis();

  if (!alerts.length) return null;

  return (
    <div className="flex-shrink-0 px-6 py-2 flex gap-3 overflow-x-auto border-b border-white/5 bg-dark-800/50">
      <AnimatePresence>
        {alerts.map((alert, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-medium font-mono ${alertStyles[alert.type]}`}
          >
            <span>{alert.icon}</span>
            <span>{alert.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
