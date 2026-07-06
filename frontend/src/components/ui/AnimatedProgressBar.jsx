import React from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';

const colorMap = {
  cyan: 'from-cyan-500 to-blue-500 shadow-[0_0_12px_rgba(6,182,212,0.3)]',
  violet: 'from-violet-500 to-fuchsia-500 shadow-[0_0_12px_rgba(139,92,246,0.3)]',
  amber: 'from-amber-500 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
  emerald: 'from-emerald-500 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]',
};

export default function AnimatedProgressBar({
  value = 0,
  label,
  color = 'cyan',
  showPercentage = true,
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const gradient = colorMap[color] || colorMap.cyan;

  return (
    <div className="w-full space-y-1.5">
      {/* Label row */}
      {(label || showPercentage) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-xs font-bold text-white ml-auto">
              {Math.round(clamped)}%
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div className="w-full h-2 bg-white/5 border border-white/5 rounded-full overflow-hidden">
        <motion.div
          className={clsx('h-full rounded-full bg-gradient-to-r', gradient)}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 15 }}
        />
      </div>
    </div>
  );
}
