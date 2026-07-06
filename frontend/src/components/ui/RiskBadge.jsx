import React from 'react';
import clsx from 'clsx';

export default function RiskBadge({ severity, size = 'sm', className }) {
  const normalizedSeverity = (severity || 'INFO').toUpperCase();

  const config = {
    CRITICAL: 'severity-critical severity-bg-critical shadow-[0_0_12px_rgba(248,113,113,0.15)]',
    HIGH:     'severity-high severity-bg-high',
    MEDIUM:   'severity-medium severity-bg-medium',
    LOW:      'severity-low severity-bg-low',
    INFO:     'severity-info severity-bg-info',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-[11px]',
  };

  const classes = config[normalizedSeverity] || config.INFO;

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-md font-black border uppercase tracking-wider',
        classes,
        sizes[size],
        className
      )}
    >
      {normalizedSeverity}
    </span>
  );
}
