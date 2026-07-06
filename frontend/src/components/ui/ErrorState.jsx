import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import GradientButton from './GradientButton';

export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="glass rounded-2xl border border-red-500/15 p-10 text-center max-w-md mx-auto space-y-5"
    >
      {/* Icon */}
      <div className="mx-auto w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertCircle size={24} className="text-red-400" />
      </div>

      {/* Message */}
      <p className="text-sm text-slate-300 leading-relaxed">{message}</p>

      {/* Retry button */}
      {onRetry && (
        <GradientButton onClick={onRetry} variant="danger" size="sm">
          Retry
        </GradientButton>
      )}
    </motion.div>
  );
}
