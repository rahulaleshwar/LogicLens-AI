import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, ChevronLeft, Download, ShieldCheck, 
  AlertTriangle, Crosshair, FileText, ChevronDown 
  , Bot, Send, Cpu, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getScan, getReport, getScanFindings, getAttackChains, askAnalysis } from '../services/api';
import GlassCard from '../components/ui/GlassCard';
import RiskBadge from '../components/ui/RiskBadge';
import GradientButton from '../components/ui/GradientButton';

export default function ReportView() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState({ scan: null, report: null, findings: [], chains: [] });
  const [loading, setLoading] = useState(true);
  const [expandedFinding, setExpandedFinding] = useState(null);
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState([]);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [scan, report, findings, chains] = await Promise.all([
          getScan(id), getReport(id), getScanFindings(id), getAttackChains(id)
        ]);
        setData({ scan, report, findings, chains });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></span>
      </div>
    );
  }

  const { scan, report, findings, chains } = data;
  if (!report) return <div className="p-8 text-center text-slate-400">Report not ready or failed.</div>;

  const summary = report.summary;
  const llmUsage = report.llm_usage || { runs: [], by_model: [], totals: {} };
  const dist = summary?.severity_distribution || {};
  const normalizeChain = (chain) => ({
    title: chain.title || chain.chain_name || 'Attack Chain',
    max_severity: chain.max_severity || chain.composite_severity || 'HIGH',
    description: chain.description || chain.narrative || '',
    steps: chain.steps || [],
  });
  const formatEvidence = (value) => {
    if (Array.isArray(value)) return value.join('\n');
    if (value && typeof value === 'object') return JSON.stringify(value, null, 2);
    return value || '';
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logiclens-report-${id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await fetch(`/api/scans/${id}/report/pdf?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { pdf_base64, filename } = await res.json();
      if (!pdf_base64) throw new Error('No PDF data received');
      // Decode base64 to binary
      const binary = atob(pdf_base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `logiclens-report-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('PDF download error:', e);
      alert('Failed to download PDF: ' + e.message);
    }
  };

  const handleAsk = async (event) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || asking) return;
    setQuestion('');
    setChat((items) => [...items, { role: 'user', text }]);
    setAsking(true);
    try {
      const result = await askAnalysis(id, text);
      setChat((items) => [...items, {
        role: 'assistant', text: result.answer,
        meta: `${result.model} · ${result.usage?.total_tokens || 0} tokens`,
      }]);
    } catch (error) {
      setChat((items) => [...items, { role: 'assistant', text: error.message, error: true }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono mb-3">
            <ChevronLeft size={14} /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-black text-white tracking-tight">Executive Report</h1>
          <p className="text-sm text-slate-500 mt-1 font-mono">{scan.target_url}</p>
        </div>
        <div className="flex items-center gap-3">
          <GradientButton variant="secondary" onClick={handleDownload} icon={Download}>
            JSON
          </GradientButton>
          <GradientButton onClick={handleDownloadPDF} icon={FileText}>
            Export PDF
          </GradientButton>
        </div>
      </div>

      <GlassCard className="p-5 border-blue-500/30" glow="cyan">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-400/20">
            <Sparkles size={18} className="text-blue-300" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">Google Hackathon Highlight</p>
            <p className="text-sm text-white font-bold mt-1">Transparent Gemini multi-agent security analysis</p>
            <p className="text-xs text-slate-400 mt-1">Every model call, agent, purpose, and provider-reported token count is auditable below.</p>
          </div>
        </div>
      </GlassCard>

      <GlassCard className={`p-5 ${report.assessment_status === 'INSUFFICIENT_EVIDENCE_FOR_VULNERABILITIES' ? 'border-amber-500/30' : 'border-emerald-500/20'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
              {report.assessment_mode || 'Legacy assessment'}
            </p>
            <p className="text-sm font-bold text-white mt-1">
              {report.assessment_status === 'INSUFFICIENT_EVIDENCE_FOR_VULNERABILITIES'
                ? 'Insufficient evidence for verified vulnerabilities'
                : 'Verified live observations'}
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Gemini/ADK analysis · Live MCP evidence · No hardcoded findings
          </span>
        </div>
      </GlassCard>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5" glow="red">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Risk Score</p>
              <p className="text-3xl font-black text-white">{summary?.total_risk_score || 0}<span className="text-sm text-slate-500 ml-1">/100</span></p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <ShieldAlert size={18} className="text-red-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5" glow="cyan">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Findings</p>
              <p className="text-3xl font-black text-white">{summary?.total_findings || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <FileText size={18} className="text-cyan-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Severity Distribution</p>
          <div className="flex h-10 rounded-lg overflow-hidden gap-0.5">
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(sev => {
              const count = dist[sev] || 0;
              if (count === 0) return null;
              const total = summary?.total_findings || 1;
              const pct = (count / total) * 100;
              const colors = {
                CRITICAL: 'bg-red-500', HIGH: 'bg-orange-500', MEDIUM: 'bg-amber-500', LOW: 'bg-blue-500', INFO: 'bg-violet-500'
              };
              return (
                <div key={sev} style={{ width: `${pct}%` }} className={`${colors[sev]} relative group`}>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-sm text-[10px] font-bold">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3">
            {['CRITICAL', 'HIGH', 'MEDIUM'].map(sev => (
              dist[sev] > 0 && (
                <div key={sev} className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                  <span className={`w-2 h-2 rounded-sm ${
                    sev === 'CRITICAL' ? 'bg-red-500' : sev === 'HIGH' ? 'bg-orange-500' : 'bg-amber-500'
                  }`} />
                  {dist[sev]} {sev}
                </div>
              )
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <p className="text-sm font-bold text-white flex items-center gap-2 mb-4"><Cpu size={16} className="text-violet-400" /> LLM Usage by Run</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div><p className="text-[10px] text-slate-500 uppercase">Calls</p><p className="text-xl font-black">{llmUsage.totals?.runs || 0}</p></div>
            <div><p className="text-[10px] text-slate-500 uppercase">Input</p><p className="text-xl font-black">{(llmUsage.totals?.prompt_tokens || 0).toLocaleString()}</p></div>
            <div><p className="text-[10px] text-slate-500 uppercase">Total tokens</p><p className="text-xl font-black text-violet-300">{(llmUsage.totals?.total_tokens || 0).toLocaleString()}</p></div>
          </div>
          <div className="max-h-72 overflow-auto space-y-2">
            {llmUsage.runs.map((run) => (
              <div key={`${run.run}-${run.timestamp}`} className="rounded-lg border border-white/5 bg-black/20 p-3">
                <div className="flex justify-between gap-3"><p className="text-xs font-bold text-slate-200">#{run.run} {run.agent}</p><span className="text-[10px] text-violet-300 font-mono">{run.model}</span></div>
                <p className="text-[10px] text-slate-500 mt-1">{run.purpose}</p>
                <p className="text-[10px] text-slate-400 mt-2 font-mono">input {run.prompt_tokens} · output {run.output_tokens} · total {run.total_tokens}{run.simulated ? ' · simulated' : ''}</p>
              </div>
            ))}
            {!llmUsage.runs.length && <p className="text-xs text-slate-500">Usage data is available on newly completed scans.</p>}
          </div>
        </GlassCard>

        <GlassCard className="p-5 flex flex-col min-h-[360px] border-cyan-500/20">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-white flex items-center gap-2"><Bot size={16} className="text-cyan-400" /> Ask This Analysis</p>
            <span className="text-[9px] uppercase tracking-wider text-cyan-300 border border-cyan-500/20 rounded-full px-2 py-1">Grounded Q&A</span>
          </div>
          <div className="flex-1 space-y-3 overflow-auto max-h-64 mb-4">
            {!chat.length && <p className="text-xs text-slate-500">Ask about risk, evidence, attack chains, remediation, or which agent found an issue.</p>}
            {chat.map((message, index) => (
              <div key={index} className={`p-3 rounded-xl text-xs leading-relaxed ${message.role === 'user' ? 'ml-8 bg-cyan-500/10 text-cyan-100' : `mr-8 bg-white/5 ${message.error ? 'text-red-300' : 'text-slate-300'}`}`}>
                {message.text}
                {message.meta && <p className="text-[9px] text-slate-500 font-mono mt-2">{message.meta}</p>}
              </div>
            ))}
            {asking && <p className="text-xs text-cyan-400 animate-pulse">Analyzing report…</p>}
          </div>
          <form onSubmit={handleAsk} className="flex gap-2">
            <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={2000}
              placeholder="Which finding should I fix first?"
              className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-500/40" />
            <button disabled={asking || !question.trim()} className="p-2.5 rounded-xl bg-cyan-500 text-slate-950 disabled:opacity-40"><Send size={16} /></button>
          </form>
        </GlassCard>
      </div>

      {/* Attack Chains */}
      {chains.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Crosshair size={16} className="text-red-400" /> 
            Validated Attack Chains
          </p>
          <div className="grid gap-4">
            {chains.map((rawChain, index) => {
              const chain = normalizeChain(rawChain);
              return (
              <GlassCard key={rawChain.id || chain.title || index} className="p-5 border-red-500/20" glow="red">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-red-400">{chain.title}</h3>
                  <RiskBadge severity={chain.max_severity} />
                </div>
                <p className="text-sm text-slate-300 mb-6 leading-relaxed">{chain.description}</p>
                
                <div className="relative">
                  <div className="absolute left-4 top-4 bottom-4 w-px bg-red-500/20" />
                  <div className="space-y-4 relative">
                    {chain.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-[#0a0f1c] border border-red-500/30 flex items-center justify-center shrink-0 z-10 text-xs font-bold text-red-400">
                          {idx + 1}
                        </div>
                        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 flex-1">
                          <p className="text-xs font-bold text-white mb-2">{step.action}</p>
                          <div className="bg-black/40 rounded p-2 text-xs font-mono text-red-300 overflow-x-auto whitespace-pre-wrap">
                            {formatEvidence(step.evidence || step.finding_title)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Findings List */}
      <div className="space-y-4">
        <p className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-400" /> 
          Detailed Findings ({findings.length})
        </p>
        
        <div className="space-y-3">
          {findings.map(finding => {
            const isExpanded = expandedFinding === finding.id;
            return (
              <GlassCard key={finding.id} className="overflow-hidden" hover={false}>
                <button 
                  onClick={() => setExpandedFinding(isExpanded ? null : finding.id)}
                  className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/5 transition-colors"
                >
                  <RiskBadge severity={finding.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{finding.title}</p>
                    <p className="text-xs text-slate-500 font-mono mt-1">{finding.category}</p>
                  </div>
                  <ChevronDown size={18} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5 bg-black/20"
                    >
                      <div className="p-5 space-y-6">
                        <div>
                          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">Description</p>
                          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{finding.description}</p>
                        </div>
                        
                        {finding.evidence && (
                          <div>
                            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">Evidence / Proof of Concept</p>
                            <div className="bg-[#05070c] border border-white/10 rounded-xl p-4 font-mono text-[11px] text-cyan-300 overflow-x-auto whitespace-pre-wrap">
                              {formatEvidence(finding.evidence)}
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                          <p className="text-xs font-mono text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <ShieldCheck size={14} /> Remediation
                          </p>
                          <p className="text-sm text-emerald-100 leading-relaxed whitespace-pre-wrap">{finding.remediation}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            );
          })}
        </div>
      </div>

    </div>
  );
}
