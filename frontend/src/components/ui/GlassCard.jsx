import React from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';

export default function GlassCard({
  children,
  className,
  hover = true,
  glow = null,
  onClick,
}) {
  const glowClasses = {
    cyan: 'card-glow-cyan',
    violet: 'card-glow-violet',
    amber: 'card-glow-amber',
    red: 'card-glow-red',
    emerald: 'card-glow-emerald',
  };

  const baseClasses = clsx(
    'card rounded-[18px] relative overflow-hidden',
    hover && 'transition-all duration-300',
    glow && glowClasses[glow],
    className
  );

  if (onClick) {
    return (
      <motion.button
        onClick={onClick}
        whileHover={hover ? { scale: 1.01 } : {}}
        whileTap={{ scale: 0.98 }}
        className={clsx(baseClasses, 'w-full text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50')}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.div
      whileHover={hover ? { scale: 1.01 } : {}}
      className={baseClasses}
    >
      {children}
    </motion.div>
  );
}
