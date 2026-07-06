import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, X, ExternalLink, Zap, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import KeyAccessModal from './KeyAccessModal';
import { getKeyStatus } from '../../services/api';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/reports', label: 'Reports' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [keyStatus, setKeyStatus] = useState({ connected: false, expires_at: null });
  const navigate = useNavigate();
  const location = useLocation();

  /* Scroll awareness — glass kicks in after 50px */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Close mobile menu on route change */
  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    getKeyStatus().then(setKeyStatus).catch(() => setKeyStatus({ connected: false }));
  }, []);

  return (
    <>
      <header
        className={clsx(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          'h-16 md:h-18',
          scrolled
            ? 'glass border-b border-white/5 shadow-2xl'
            : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-5 h-full flex items-center justify-between gap-4">

          {/* ─── Left: Branding ─────────────────────── */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 shrink-0 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="text-base font-black tracking-tight gradient-text-accent">
              LogicLens AI
            </span>
          </button>

          {/* ─── Center: Navigation ────────────────── */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200',
                    isActive
                      ? 'text-white bg-white/8 border border-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* ─── Right: Actions ────────────────────── */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setKeyModalOpen(true)}
              className={clsx(
                'hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold border transition-all',
                keyStatus.connected
                  ? 'text-emerald-300 bg-emerald-500/5 border-emerald-500/20'
                  : 'text-cyan-300 bg-cyan-500/5 border-cyan-500/20 hover:bg-cyan-500/10'
              )}
            >
              <span className={clsx('w-1.5 h-1.5 rounded-full', keyStatus.connected ? 'bg-emerald-400' : 'bg-slate-600')} />
              <KeyRound size={13} />
              {keyStatus.connected ? 'Key connected' : 'Connect Gemini'}
            </button>
            {/* GitHub (secondary outlined) */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white border border-white/8 hover:border-white/15 hover:bg-white/5 transition-all"
            >
              GitHub
              <ExternalLink size={12} />
            </a>

            {/* Start Scan (primary gradient) */}
            <button
              onClick={() => navigate('/scan/new')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-violet-500 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-105 transition-all duration-200 cursor-pointer"
            >
              <Zap size={13} />
              Start Scan
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* ─── Mobile Drawer ─────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden overflow-hidden border-t border-white/5 bg-[#04060d]/98 backdrop-blur-2xl"
            >
              <div className="px-5 py-4 flex flex-col gap-1">
                {navLinks.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      clsx(
                        'px-4 py-3 rounded-xl text-sm font-semibold transition-all',
                        isActive
                          ? 'text-white bg-white/8'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      )
                    }
                  >
                    {label}
                  </NavLink>
                ))}

                {/* Mobile: Start Scan */}
                <button
                  onClick={() => setKeyModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-cyan-300 border border-cyan-500/20 bg-cyan-500/5"
                >
                  <KeyRound size={14} />
                  {keyStatus.connected ? 'Manage Gemini key' : 'Connect Gemini key'}
                </button>

                <button
                  onClick={() => navigate('/scan/new')}
                  className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-violet-500 cursor-pointer"
                >
                  <Zap size={14} />
                  Start Scan
                </button>

                {/* Mobile: GitHub */}
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white border border-white/8 hover:bg-white/5 transition-all"
                >
                  GitHub
                  <ExternalLink size={14} />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer matching navbar height */}
      <div className="h-16 md:h-18" />
      <KeyAccessModal
        open={keyModalOpen}
        connected={keyStatus.connected}
        expiresAt={keyStatus.expires_at}
        onClose={() => setKeyModalOpen(false)}
        onStatusChange={setKeyStatus}
      />
    </>
  );
}
