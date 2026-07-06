import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff, KeyRound, LoaderCircle, LogOut, ShieldCheck, X } from 'lucide-react';
import { connectGeminiKey, disconnectGeminiKey } from '../../services/api';

export default function KeyAccessModal({ open, connected, expiresAt, onClose, onStatusChange }) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setApiKey('');
      setShowKey(false);
      setError('');
    }
  }, [open]);

  const connect = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const status = await connectGeminiKey(apiKey.trim());
      onStatusChange(status);
      setApiKey('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError('');
    try {
      await disconnectGeminiKey();
      onStatusChange({ connected: false, expires_at: null });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5"
          onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#080d18] shadow-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-white/5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <KeyRound size={18} className="text-cyan-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-white">Bring your own Gemini key</p>
                <p className="text-xs text-slate-500 mt-1">Required for Gemini/ADK live scans, report Q&A, and agent conversations.</p>
              </div>
              <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white"><X size={17} /></button>
            </div>

            <div className="p-5">
              {connected ? (
                <div className="space-y-5">
                  <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4 flex gap-3">
                    <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-200">Gemini key connected</p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Stored only in server memory{expiresAt ? ` until ${new Date(expiresAt).toLocaleString()}` : ''}.
                      </p>
                    </div>
                  </div>
                  <button onClick={disconnect} disabled={busy}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-3 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50">
                    {busy ? <LoaderCircle size={15} className="animate-spin" /> : <LogOut size={15} />}
                    Remove key
                  </button>
                </div>
              ) : (
                <form onSubmit={connect} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gemini API key</label>
                    <div className="relative mt-2">
                      <input
                        value={apiKey}
                        onChange={(event) => setApiKey(event.target.value)}
                        type={showKey ? 'text' : 'password'}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="AIza..."
                        className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-3 pr-11 text-sm font-mono text-white outline-none focus:border-cyan-500/40"
                      />
                      <button type="button" onClick={() => setShowKey((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-500">
                    The key is validated by Google, held in process memory for up to 8 hours, and represented in your browser by an HttpOnly session cookie. It is not written to the database or browser storage.
                  </p>
                  {error && <p className="text-xs text-red-300">{error}</p>}
                  <button disabled={busy || apiKey.trim().length < 20}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 py-3 text-xs font-black text-white disabled:opacity-40">
                    {busy && <LoaderCircle size={15} className="animate-spin" />}
                    Validate and connect
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
