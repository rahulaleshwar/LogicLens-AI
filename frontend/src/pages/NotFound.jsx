import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldOff, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-md"
      >
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8">
          <ShieldOff size={36} className="text-red-400" />
        </div>

        {/* Error Code */}
        <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-slate-600 mb-4">
          404
        </h1>

        {/* Message */}
        <h2 className="text-xl font-bold text-white mb-3">
          Page Not Found
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-8">
          The requested resource doesn't exist or has been moved. 
          This area is outside the scan perimeter.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-500 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all"
          >
            Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}
