import React from 'react';
import { Clock, CheckCircle2, XCircle, MoreHorizontal, Brain, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

export default function StatusBadge({ status, className }) {
  const normalizedStatus = (status || 'pending').toLowerCase();

  const config = {
    pending: {
      label: 'Queued',
      icon: Clock,
      classes: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    },
    running: {
      label: 'Running',
      icon: null, // Custom pulse dot
      classes: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]',
    },
    completed: {
      label: 'Completed',
      icon: CheckCircle2,
      classes: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    failed: {
      label: 'Failed',
      icon: XCircle,
      classes: 'text-red-400 bg-red-500/10 border-red-500/20',
    },
    idle: {
      label: 'Idle',
      icon: MoreHorizontal,
      classes: 'text-slate-500 bg-white/5 border-white/10',
    },
    reflecting: {
      label: 'Reflecting',
      icon: Brain,
      classes: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    },
    debating: {
      label: 'Debating',
      icon: MessageSquare,
      classes: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
  };

  const { label, icon: Icon, classes } = config[normalizedStatus] || config.pending;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border tracking-wide uppercase',
        classes,
        className
      )}
    >
      {normalizedStatus === 'running' ? (
        <span className="relative flex h-2 w-2 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
        </span>
      ) : Icon ? (
        <Icon size={12} strokeWidth={3} />
      ) : null}
      {label}
    </span>
  );
}
