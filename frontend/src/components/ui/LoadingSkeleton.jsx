import React from 'react';
export default function LoadingSkeleton({ variant = 'card', count = 1 }) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  if (variant === 'card') {
    return (
      <div className="space-y-4">
        {skeletons.map((key) => (
          <div key={key} className="skeleton h-32 rounded-2xl border border-white/5 p-6 space-y-3">
            <div className="skeleton h-3 w-1/3 rounded" />
            <div className="skeleton h-2.5 w-full rounded" />
            <div className="skeleton h-2.5 w-4/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <div className="space-y-3">
        {skeletons.map((key) => (
          <div
            key={key}
            className="skeleton h-12 rounded-xl border border-white/5 flex items-center gap-4 px-4"
          >
            <div className="skeleton h-3 w-1/4 rounded" />
            <div className="skeleton h-3 w-1/3 rounded ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'stat') {
    return (
      <div className="flex flex-wrap gap-4">
        {skeletons.map((key) => (
          <div
            key={key}
            className="skeleton h-20 w-36 rounded-xl border border-white/5 p-4 space-y-2"
          >
            <div className="skeleton h-2.5 w-1/2 rounded" />
            <div className="skeleton h-4 w-3/4 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return null;
}
