import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Zap, Shield, Cpu, Network, CheckCircle2, AlertCircle, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { createScan } from '../services/api';
import GlassCard from '../components/ui/GlassCard';
import GradientButton from '../components/ui/GradientButton';

const PROFILES = [
  {
    id: 'quick', icon: Network, color: 'cyan',
    title: 'Quick Recon',
    desc: 'DNS, headers, banners, CVE lookups. Fast surface-level check.',
    time: '2-5 min',
  },
  {
    id: 'standard', icon: Cpu, color: 'violet',
    title: 'Standard Audit',
    desc: 'Static code analysis, endpoint mapping, auth testing.',
    time: '5-12 min',
  },
  {
    id: 'deep', icon: Shield, color: 'amber',
    title: 'Deep Team Debate',
    desc: 'Full live passive MCP inspection with evidence ledger and explicit limitations.',
    time: '10-20 min',
  },
];

const PROFILE_COLORS = {
  cyan: { text: 'text-cyan-400', border: 'border-cyan-500/40', softBorder: 'border-cyan-500/30', bg: 'bg-cyan-500/10' },
  violet: { text: 'text-violet-400', border: 'border-violet-500/40', softBorder: 'border-violet-500/30', bg: 'bg-violet-500/10' },
  amber: { text: 'text-amber-400', border: 'border-amber-500/40', softBorder: 'border-amber-500/30', bg: 'bg-amber-500/10' },
};

const AGENTS_INFO = [
  { name: 'Planner', desc: 'Scope analysis and strategy', icon: 'PL', always: true },
  { name: 'Recon', desc: 'Subdomains, ports, dirs', icon: 'RC' },
  { name: 'Tech Fingerprint', desc: 'OS, frameworks, CVEs', icon: 'TF' },
  { name: 'JS Analysis', desc: 'Secrets and endpoints in JS', icon: 'JS' },
  { name: 'API Discovery', desc: 'Public link inventory; no probing', icon: 'API' },
  { name: 'Authentication', desc: 'Tokens, MFA bypass', icon: 'AUTH' },
  { name: 'Workflow Learning', desc: 'Evidence correlation', icon: 'WF' },
  { name: 'Business Logic', desc: 'Skipped without active evidence', icon: 'BL' },
];

const PRESETS = {
  quick: { Planner: true, Recon: true, 'Tech Fingerprint': true, 'JS Analysis': false, 'API Discovery': false, Authentication: false, 'Workflow Learning': false, 'Business Logic': false },
  standard: { Planner: true, Recon: true, 'Tech Fingerprint': true, 'JS Analysis': true, 'API Discovery': true, Authentication: true, 'Workflow Learning': false, 'Business Logic': false },
  deep: Object.fromEntries(AGENTS_INFO.map((a) => [a.name, true])),
};

export default function NewScan() {
  const navigate = useNavigate();
  const [targetUrl, setTargetUrl] = useState('');
  const [scanType, setScanType] = useState('deep');
  const [llmModel, setLlmModel] = useState('flash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedAgents, setSelectedAgents] = useState(PRESETS.deep);

  useEffect(() => {
    setSelectedAgents(PRESETS[scanType]);
  }, [scanType]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    const url = targetUrl.trim();
    if (!url) { setError('Target URL is required.'); return; }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL must begin with http:// or https://');
      return;
    }

    try {
      setLoading(true);
      const selected_agents = Object.entries(selectedAgents)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name);
      const scan = await createScan({
        target_url: url,
        scan_type: scanType,
        selected_agents,
        llm_model: llmModel,
      });
      navigate(`/scan/${scan.id}`);
    } catch (err) {
      setError(err.message || 'Failed to initialize scan.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <div className="space-y-4">
        <button onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono">
          <ChevronLeft size={14} /> Back to Dashboard
        </button>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">New Security Assessment</h1>
          <p className="text-sm text-slate-500 mt-1">Deploy your AI specialist team against a target.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-3">
          <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Target URL</label>
          <GlassCard className="p-1" glow="cyan" hover={false}>
            <div className="relative flex items-center">
              <Globe size={18} className="absolute left-4 text-slate-500" />
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => { setTargetUrl(e.target.value); setError(''); }}
                placeholder="https://example-target.com"
                className="w-full bg-transparent border-none py-4 pl-12 pr-4 text-sm text-white placeholder-slate-600 font-mono focus:outline-none focus:ring-0"
                autoFocus
              />
            </div>
          </GlassCard>
          {error && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs text-red-400 font-mono px-2">
              <AlertCircle size={14} /> {error}
            </motion.p>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">LLM Model</label>
          <GlassCard className="p-2" hover={false}>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'flash', title: 'Gemini Flash', desc: 'Faster, lower-cost analysis' },
                { id: 'pro', title: 'Gemini Pro', desc: 'Deeper, higher-quality analysis' },
              ].map((option) => {
                const selected = llmModel === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLlmModel(option.id)}
                    aria-pressed={selected}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      selected
                        ? 'border-violet-500/40 bg-violet-500/10'
                        : 'border-white/5 bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-sm font-bold ${selected ? 'text-white' : 'text-slate-300'}`}>
                        {option.title}
                      </p>
                      {selected && <CheckCircle2 size={16} className="text-violet-400" />}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">{option.desc}</p>
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Scan Profile</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PROFILES.map((profile) => {
              const Icon = profile.icon;
              const isSelected = scanType === profile.id;
              const color = PROFILE_COLORS[profile.color];
              return (
                <GlassCard
                  key={profile.id}
                  onClick={() => setScanType(profile.id)}
                  glow={isSelected ? profile.color : null}
                  className={`p-4 space-y-3 transition-all ${isSelected ? `${color.border} bg-white/5` : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <Icon size={18} className={isSelected ? color.text : 'text-slate-500'} />
                    {isSelected && <CheckCircle2 size={16} className={color.text} />}
                  </div>
                  <div>
                    <p className={`text-sm font-bold mb-1 ${isSelected ? 'text-white' : 'text-slate-300'}`}>{profile.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{profile.desc}</p>
                  </div>
                  <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded border ${isSelected ? `${color.text} ${color.softBorder} ${color.bg}` : 'text-slate-600 bg-white/5 border-white/10'}`}>
                    ~{profile.time}
                  </span>
                </GlassCard>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Agent Team Configuration</label>
          <GlassCard className="p-4" hover={false}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {AGENTS_INFO.map((agent) => {
                const active = selectedAgents[agent.name];
                return (
                  <button
                    key={agent.name}
                    type="button"
                    onClick={() => { if (!agent.always) setSelectedAgents((prev) => ({ ...prev, [agent.name]: !prev[agent.name] })); }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      agent.always ? 'cursor-not-allowed opacity-70 border-white/6 bg-white/2' :
                      active ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-white/5 hover:border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-slate-300">{agent.icon}</span>
                      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center ${active ? 'bg-cyan-500' : 'bg-white/10'}`}>
                        {active && <CheckCircle2 size={12} className="text-white" />}
                      </span>
                    </div>
                    <p className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-400'}`}>{agent.name}</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">{agent.desc}</p>
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <GradientButton variant="ghost" onClick={() => navigate('/dashboard')} disabled={loading}>
            Cancel
          </GradientButton>
          <GradientButton type="submit" loading={loading} icon={Zap} size="lg">
            Launch Assessment
          </GradientButton>
        </div>
      </form>
    </div>
  );
}
