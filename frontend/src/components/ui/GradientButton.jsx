import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export default function GradientButton({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled = false,
  onClick,
  className,
  type = 'button',
}) {
  const baseStyles = 'relative inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070b] focus-visible:ring-cyan-500/50';

  const variants = {
    primary: 'text-slate-950 bg-cyan-300 hover:bg-cyan-200 border border-cyan-200/50 shadow-[0_14px_28px_rgba(20,184,166,0.18)]',
    secondary: 'text-slate-200 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20',
    danger: 'text-white bg-rose-500 hover:bg-rose-400 border border-rose-300/40 shadow-[0_14px_28px_rgba(244,63,94,0.16)]',
    success: 'text-slate-950 bg-emerald-300 hover:bg-emerald-200 border border-emerald-200/50 shadow-[0_14px_28px_rgba(16,185,129,0.16)]',
    ghost: 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[11px]',
    md: 'px-4.5 py-2.5 text-xs',
    lg: 'px-5.5 py-3 text-sm',
  };

  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      whileTap={!isDisabled ? { scale: 0.96 } : {}}
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        isDisabled && 'opacity-60 cursor-not-allowed saturate-50',
        className
      )}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} />
      ) : null}
      
      {children && <span>{children}</span>}
      
      {/* Subtle top inner highlight for primary/danger/success buttons */}
      {(variant === 'primary' || variant === 'danger' || variant === 'success') && (
        <div className="absolute inset-0 rounded-xl pointer-events-none border-t border-white/25 mix-blend-overlay" />
      )}
    </motion.button>
  );
}
