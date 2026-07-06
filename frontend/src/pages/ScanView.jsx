import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Terminal, ShieldAlert, Wifi, WifiOff, FileText, CheckCircle2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getScan } from '../services/api';
import useScanStore from '../stores/scanStore';
import GlassCard from '../components/ui/GlassCard';
import StatusBadge from '../components/ui/StatusBadge';
import ProgressRing from '../components/ui/ProgressRing';
import AnimatedProgressBar from '../components/ui/AnimatedProgressBar';
import GradientButton from '../components/ui/GradientButton';
import RiskBadge from '../components/ui/RiskBadge';

const AGENT_META = {
  Planner: { role: 'Strategy', label: 'PL' },
  Recon: { role: 'Footprinting', label: 'RC' },
  'Tech Fingerprint': { role: 'Stack ID', label: 'TF' },
  'JS Analysis': { role: 'Code Audit', label: 'JS' },
  'API Discovery': { role: 'Endpoints', label: 'API' },
  Authentication: { role: 'Access', label: 'AUTH' },
  'Workflow Learning': { role: 'Correlation', label: 'WF' },
  'Business Logic': { role: 'Logic', label: 'BL' },
};

function statusClass(status) {
  if (status === 'running') return 'bg-cyan-500/10 border-cyan-500/30';
  if (status === 'completed') return 'bg-emerald-500/10 border-emerald-500/20';
  if (status === 'failed') return 'bg-red-500/10 border-red-500/20';
  if (status === 'skipped') return 'bg-slate-500/5 border-slate-500/10 opacity-60';
  return 'bg-white/[0.02] border-white/5';
}

export default function ScanView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    agents, events, findings, debates, isConnected, joinScan, leaveScan,
    scanProgress, currentPhase, hydrateFromScan,
  } = useScanStore();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getScan(id);
        setScan(data);
        if (data.status === 'completed' || data.status === 'failed') {
          navigate(`/scan/${id}/report`, { replace: true });
        } else {
          hydrateFromScan(data);
          joinScan(id, { preserveState: true });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => leaveScan();
  }, [id, joinScan, leaveScan, navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></span>
      </div>
    );
  }

  if (!scan) return <div>Scan not found</div>;

  return (
    <div className="h-screen flex flex-col bg-[#030712] overflow-hidden">
      <header className="h-16 shrink-0 border-b border-white/10 bg-[#060a14]/90 backdrop-blur-xl flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <ChevronLeft size={18} />
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-white">#SCAN-{id}</span>
              <StatusBadge status={scan.status} />
            </div>
            <p className="text-xs text-slate-500 font-medium">{scan.target_url}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs font-mono">
            {isConnected ? (
              <><Wifi size={14} className="text-emerald-400" /><span className="text-emerald-400/80">Live Sync</span></>
            ) : (
              <><WifiOff size={14} className="text-red-400" /><span className="text-red-400/80">Offline</span></>
            )}
          </div>
          <GradientButton variant="secondary" size="sm" icon={FileText} onClick={() => navigate(`/scan/${id}/report`)}>
            View Report
          </GradientButton>
        </div>
      </header>

      <div className="flex-1 overflow-hidden grid lg:grid-cols-12 gap-6 p-6">
        <div className="lg:col-span-3 flex flex-col gap-6 overflow-hidden">
          <GlassCard className="p-6 flex flex-col items-center justify-center shrink-0" hover={false}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Overall Progress</p>
            <p className="text-xs text-slate-500 mb-5">{currentPhase}</p>
            <ProgressRing value={scanProgress} size={160} strokeWidth={10} />

            <div className="w-full space-y-4 mt-8">
              <AnimatedProgressBar value={currentPhase === 'Initialization' ? 0 : Math.min(scanProgress, 100)} label="Current Phase" color="cyan" />
              <AnimatedProgressBar value={(agents.filter((a) => a.status === 'completed').length / agents.length) * 100} label="Agents Complete" color="violet" />
              <AnimatedProgressBar value={scanProgress >= 85 ? 100 : 0} label="Evidence Validation" color="amber" />
            </div>
          </GlassCard>

          <GlassCard className="p-5 flex-1 overflow-hidden flex flex-col" hover={false}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 shrink-0">Agent Team</p>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {agents.map((agent) => {
                const meta = AGENT_META[agent.id] || { role: agent.role, label: agent.id.slice(0, 2).toUpperCase() };
                return (
                  <div key={agent.id} className={`p-3 rounded-xl border transition-all ${statusClass(agent.status)}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-300 shrink-0">{meta.label}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${agent.status === 'running' ? 'text-cyan-400' : 'text-slate-300'}`}>{agent.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{agent.info || meta.role}</p>
                      </div>
                      {agent.status === 'running' && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        <GlassCard className="lg:col-span-6 flex flex-col overflow-hidden terminal" hover={false}>
          <div className="terminal-header shrink-0 bg-black/40">
            <Terminal size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">Live Operation Stream</span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px] leading-relaxed custom-scrollbar bg-black/20">
            {events.length === 0 ? (
              <p className="text-slate-500 text-center mt-10">Initializing agents...</p>
            ) : (
              <AnimatePresence initial={false}>
                {events.map((event, i) => (
                  <motion.div key={event.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
                    <span className="text-slate-600 shrink-0 select-none">
                      [{new Date(event.timestamp).toLocaleTimeString([], { hour12: false })}]
                    </span>
                    <span className="text-cyan-400 font-semibold shrink-0">{event.agent || event.type}:</span>
                    <span className="text-slate-300 break-words whitespace-pre-wrap">{event.message}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            <div className="h-4" />
          </div>
        </GlassCard>

        <div className="lg:col-span-3 flex flex-col gap-6 overflow-hidden">
          <GlassCard className="p-5 flex-1 overflow-hidden flex flex-col" hover={false}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare size={14} /> Evidence Policy
              </p>
              {debates.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-500" />}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {debates.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <MessageSquare size={24} className="text-slate-500 mb-2" />
                  <p className="text-xs text-slate-500">Deterministic MCP evidence only</p>
                </div>
              ) : (
                debates.map((debate) => (
                  <div key={debate.id} className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/20 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="font-bold text-white truncate">{debate.finding_title}</p>
                      <RiskBadge severity={debate.final_severity} />
                    </div>
                    <p className="text-amber-300 font-mono mb-2">{debate.verdict}</p>
                    <p className="text-slate-300 leading-relaxed">{debate.rationale}</p>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5 flex-1 overflow-hidden flex flex-col" hover={false}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert size={14} /> Live Findings
              </p>
              <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded">{findings.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {findings.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <CheckCircle2 size={24} className="text-slate-500 mb-2" />
                  <p className="text-xs text-slate-500">All clear so far</p>
                </div>
              ) : (
                <AnimatePresence>
                  {findings.map((finding, i) => (
                    <motion.div key={finding.id || i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-bold text-white truncate">{finding.title}</p>
                        <RiskBadge severity={finding.severity} />
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{finding.category}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
