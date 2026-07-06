import React from 'react';
import { motion } from 'motion/react';
import GradientButton from './GradientButton';
import clsx from 'clsx';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={clsx(
        "flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]",
        className
      )}
    >
      {Icon && (
        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-5 shadow-inner">
          <Icon size={28} className="text-slate-400" />
        </div>
      )}
      <h3 className="text-base font-bold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <GradientButton onClick={action.onClick} icon={action.icon}>
          {action.label}
        </GradientButton>
      )}
    </motion.div>
  );
}
