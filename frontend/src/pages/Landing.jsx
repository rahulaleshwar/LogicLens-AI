import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Zap, Brain, GitBranch, Terminal,
  Target, Network, Eye, MessageSquare, BarChart2, Layers,
  Bot, Cloud, Container, KeyRound, Plug, Workflow
} from 'lucide-react';
import { motion, useInView } from 'motion/react';
import GlassCard from '../components/ui/GlassCard';
import GradientButton from '../components/ui/GradientButton';

const AGENTS = [
  { id: 'Coordinator', label: 'Coordinator', color: '#22d3ee', angle: 0, r: 0 },
  { id: 'Recon', label: 'Recon', color: '#818cf8', angle: 0, r: 130 },
  { id: 'Auth', label: 'Auth', color: '#34d399', angle: 60, r: 130 },
  { id: 'JS Analysis', label: 'JS', color: '#fbbf24', angle: 120, r: 130 },
  { id: 'API', label: 'API', color: '#fb923c', angle: 180, r: 130 },
  { id: 'Tech', label: 'Tech', color: '#c084fc', angle: 240, r: 130 },
  { id: 'Logic', label: 'Logic', color: '#f87171', angle: 300, r: 130 },
];

function AgentOrb({ agent, active, onClick }) {
  const isCenter = agent.r === 0;
  const rad = (agent.angle * Math.PI) / 180;
  const x = 160 + agent.r * Math.cos(rad);
  const y = 160 + agent.r * Math.sin(rad);

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: agent.angle / 600, duration: 0.5 }}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(agent.id)}
    >
      {isCenter ? null : (
        <motion.line
          x1={160} y1={160} x2={x} y2={y}
          stroke={agent.color} strokeWidth="1" strokeOpacity="0.2"
          strokeDasharray="4,4"
          animate={{ strokeOpacity: active ? 0.5 : 0.15 }}
        />
      )}
      {/* Outer glow ring */}
      {active && (
        <motion.circle cx={x} cy={y} r={isCenter ? 36 : 26}
          fill="none" stroke={agent.color} strokeWidth="1" strokeOpacity="0.4"
          animate={{ r: [isCenter ? 36 : 26, isCenter ? 42 : 32, isCenter ? 36 : 26] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}
      <motion.circle
        cx={x} cy={y} r={isCenter ? 30 : 22}
        fill={`${agent.color}15`}
        stroke={agent.color}
        strokeWidth={isCenter ? 2 : 1.5}
        strokeOpacity={active ? 1 : 0.4}
        animate={{ strokeOpacity: active ? 1 : 0.35 }}
      />
      <text x={x} y={y + 4} textAnchor="middle" fill={agent.color} fontSize={isCenter ? 9 : 7.5}
        fontWeight="700" letterSpacing="0.05em" fontFamily="system-ui">
        {agent.label}
      </text>
      {active && (
        <motion.circle cx={x + (isCenter ? 22 : 16)} cy={y - (isCenter ? 22 : 16)} r="4"
          fill="#22d3ee"
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
      )}
    </motion.g>
  );
}

function NetworkViz() {
  const [active, setActive] = useState('Coordinator');
  useEffect(() => {
    const ids = AGENTS.map(a => a.id);
    let i = 0;
    const t = setInterval(() => { i = (i + 1) % ids.length; setActive(ids[i]); }, 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 to-transparent rounded-3xl" />
      <svg viewBox="0 0 320 320" className="w-full max-w-sm h-auto">
        {AGENTS.map(a => <AgentOrb key={a.id} agent={a} active={active === a.id} onClick={setActive} />)}
        {/* Shared memory ring */}
        <circle cx={160} cy={160} r={75} fill="none" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.1" strokeDasharray="3,6" />
      </svg>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-mono text-cyan-500/60 tracking-widest uppercase">
        Shared Memory Layer
      </div>
    </div>
  );
}

function TerminalLine({ text, delay = 0 }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShown(true), delay); return () => clearTimeout(t); }, [delay]);
  if (!shown) return null;
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2 text-xs font-mono">
      <span className="text-cyan-500 select-none shrink-0">›</span>
      <span className="text-slate-300">{text}</span>
    </motion.div>
  );
}

function LiveTerminal() {
  const lines = [
    { text: 'Creating bounded passive MCP inspection plan...', delay: 300 },
    { text: 'Validating public target and redirect destinations...', delay: 900 },
    { text: 'MCP inspect_http_url: issuing size-limited live GET...', delay: 1600 },
    { text: 'Response received: status, headers, timing, final URL', delay: 2400 },
    { text: 'Google ADK specialists analyzing the live evidence ledger...', delay: 3100 },
    { text: 'Gemini header, cookie, inventory, and TLS agents running...', delay: 3900 },
    { text: 'ADK reviewer correlating specialist outputs...', delay: 4700 },
    { text: 'Rejecting LLM claims without exact MCP evidence citations...', delay: 5500 },
    { text: 'Unsupported active-test hypotheses marked insufficient evidence', delay: 6300 },
    { text: '✓ Live MCP + Gemini ADK report compiled', delay: 7100 },
  ];
  const [started, setStarted] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => { if (inView) setStarted(true); }, [inView]);

  return (
    <div ref={ref} className="bg-[#070b14] rounded-2xl border border-white/6 overflow-hidden shadow-2xl terminal">
      <div className="terminal-header bg-black/40">
        <div className="flex gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-amber-500/80" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <span className="ml-3 text-[10px] font-mono text-slate-500">logiclens — collaborative-scan</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-mono text-cyan-500">LIVE</span>
        </div>
      </div>
      <div className="p-5 space-y-2 min-h-[260px] bg-black/20">
        {started && lines.map((l, i) => <TerminalLine key={i} text={l.text} delay={l.delay} />)}
        {started && <div className="flex items-center gap-2 mt-2 text-xs font-mono text-cyan-400">
          <span>›</span><span className="animate-pulse">█</span>
        </div>}
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Brain, color: 'cyan', title: 'Gemini Multi-Agent Analysis',
    desc: 'ADK agents plan, specialize, correlate, and review. Every LLM finding must still map to exact live MCP evidence.'
  },
  {
    icon: MessageSquare, color: 'violet', title: 'Evidence Citation Gate',
    desc: 'Gemini performs the analysis, while a strict citation gate rejects any claim that does not exactly match the MCP ledger.'
  },
  {
    icon: GitBranch, color: 'amber', title: 'Raw Evidence Ledger',
    desc: 'Reports retain the final URL, HTTP status, redirects, redacted headers, timing, TLS metadata, and public resource inventory.'
  },
  {
    icon: Eye, color: 'emerald', title: 'Honest Coverage Limits',
    desc: 'Passive inspection cannot prove authorization or business-logic flaws. LogicLens labels those areas as insufficient evidence.'
  },
  {
    icon: Layers, color: 'red', title: 'Self-Reflection Loop',
    desc: 'Agents evaluate their own confidence after each scan phase and request re-investigation when coverage is insufficient.'
  },
  {
    icon: Network, color: 'cyan', title: 'MCP Extension Points',
    desc: 'A real MCP server exposes bounded HTTP, security-header, link, and TLS inspection tools with SSRF protection.'
  },
];

const GOOGLE_FEATURES = [
  {
    icon: Workflow,
    title: 'Google ADK Workflow',
    label: 'Orchestration',
    desc: 'A graph-based ADK workflow plans the scan, gathers MCP evidence, fans out to specialist agents, and joins results for review.',
  },
  {
    icon: Bot,
    title: 'Gemini 2.5 Models',
    label: 'Reasoning',
    desc: 'Gemini Flash powers planning and specialist analysis; Gemini Pro performs the final evidence review and grounded report Q&A.',
  },
  {
    icon: Plug,
    title: 'Model Context Protocol',
    label: 'Tools',
    desc: 'ADK discovers passive inspection tools from the bundled MCP server instead of allowing the model to invent scan evidence.',
  },
  {
    icon: KeyRound,
    title: 'Bring Your Own Key',
    label: 'Privacy',
    desc: 'Users opt in with their own Gemini key. It stays in server memory behind an opaque HttpOnly cookie and can be removed anytime.',
  },
  {
    icon: Container,
    title: 'Agents CLI',
    label: 'Engineering',
    desc: 'The repository includes an Agents CLI manifest, agent skill, safety evaluations, linting, and a reproducible ADK project structure.',
  },
  {
    icon: Cloud,
    title: 'Google Cloud Run',
    label: 'Deployment',
    desc: 'Docker and Google Cloud Build configurations package the existing FastAPI product and ADK API into one Cloud Run service.',
  },
];

const COLOR_MAP = {
  cyan: { text: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' },
  violet: { text: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/20' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  red: { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
};

function FeatureCard({ icon: Icon, color, title, desc, i }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const c = COLOR_MAP[color] || COLOR_MAP.cyan;
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: (i % 3) * 0.1, duration: 0.5 }}
    >
      <GlassCard className="p-6 space-y-4 group" hover={true} glow={color}>
        <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
          <Icon size={18} className={c.text} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-100 mb-2">{title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
        </div>
      </GlassCard>
    </motion.div>
  );
}

const WORKFLOW = [
  { step: '01', label: 'Target Input', desc: 'URL, scope, scan type' },
  { step: '02', label: 'Parallel Recon', desc: 'All agents launch simultaneously' },
  { step: '03', label: 'Shared Memory', desc: 'Findings merged & correlated' },
  { step: '04', label: 'Peer Debate', desc: 'Agents challenge each other' },
  { step: '05', label: 'Consensus', desc: 'Only validated findings pass' },
  { step: '06', label: 'Report', desc: 'Attack chains + remediation' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      
      {/* ── HERO ── */}
      <section className="relative min-h-[90vh] flex items-center pt-8 pb-20 overflow-hidden">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[120px]" />
          <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-16 items-center z-10">
          
          {/* Left — copy */}
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-cyan-500/8 border border-cyan-500/20 text-cyan-400 text-[11px] font-bold tracking-widest uppercase mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Collaborative Multi-Agent Security Platform
              </div>

              <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.08] tracking-tight">
                AI Agents That{' '}
                <span className="gradient-text-hero">Debate</span>
                {' '}Before They Report
              </h1>
            </motion.div>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}
              className="text-base text-slate-400 leading-relaxed max-w-lg">
              LogicLens AI deploys a specialist security team — eight agents working in parallel, sharing memory,
              while preserving the exact live evidence behind every reported observation.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.6 }}
              className="flex items-center gap-4 flex-wrap">
              <GradientButton 
                onClick={() => navigate('/scan/new')} 
                size="lg" 
                icon={Zap}
              >
                Launch Scan
              </GradientButton>
              <GradientButton 
                variant="secondary" 
                onClick={() => navigate('/dashboard')} 
                size="lg" 
                icon={BarChart2}
              >
                Dashboard
              </GradientButton>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="flex items-center gap-6 text-xs text-slate-500 font-mono">
              {['Google ADK', 'Gemini 2.5', 'MCP tools', 'Cloud Run ready'].map(tag => (
                <span key={tag} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-cyan-500" />
                  {tag}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right — network viz */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.8 }}>
            <GlassCard className="p-6 lg:p-8" hover={false}>
              <NetworkViz />
              <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-3">
                {[
                  { label: 'Agents', value: '8', color: 'text-cyan-400' },
                  { label: 'Debate Engine', value: 'Active', color: 'text-violet-400' },
                  { label: 'Memory', value: 'Shared', color: 'text-emerald-400' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className={`text-sm font-black ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* GOOGLE STACK */}
      <section className="py-20 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.07),transparent_45%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-12">
            <p className="text-[11px] font-mono text-blue-400 tracking-widest uppercase mb-3">Google Hackathon Technology</p>
            <h2 className="text-3xl font-black text-white tracking-tight">Google Features Used in LogicLens</h2>
            <p className="text-sm text-slate-500 mt-3 max-w-2xl mx-auto">
              Each item below is implemented in the repository and connected to the running application.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {GOOGLE_FEATURES.map(({ icon: Icon, title, label, desc }) => (
              <GlassCard key={title} className="p-6" hover>
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
                    <Icon size={18} className="text-blue-300" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-300 border border-blue-500/20 rounded-full px-2 py-1">{label}</span>
                </div>
                <h3 className="text-sm font-bold text-white">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-2">{desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKFLOW ── */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[11px] font-mono text-cyan-400 tracking-widest uppercase mb-3">Execution Lifecycle</p>
            <h2 className="text-3xl font-black text-white tracking-tight">From Target to Consensus</h2>
          </div>
          <div className="relative">
            <div className="absolute top-6 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent hidden lg:block" />
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {WORKFLOW.map((w, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="flex flex-col items-center text-center group">
                  <div className="w-12 h-12 rounded-full bg-[#0c1220] border border-white/8 flex items-center justify-center mb-4 relative z-10 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/5 transition-colors">
                    <span className="text-[11px] font-black text-cyan-500 font-mono">{w.step}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-200 mb-1">{w.label}</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{w.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE TERMINAL ── */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <p className="text-[11px] font-mono text-emerald-400 tracking-widest uppercase">Real-Time Collaboration</p>
            <h2 className="text-3xl font-black text-white leading-tight tracking-tight">
              Watch Agents Reason Together
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every scan streams live — you see which agents are active, what they're finding,
              and which checks are skipped because the available evidence is insufficient.
            </p>
            <div className="space-y-3">
              {[
                { icon: Terminal, text: 'Live WebSocket event stream' },
                { icon: MessageSquare, text: 'Evidence and limitation events' },
                { icon: Target, text: 'Deterministic finding validation' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-slate-400">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-slate-400" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>
          <LiveTerminal />
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="py-20 border-t border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[11px] font-mono text-violet-400 tracking-widest uppercase mb-3">Capabilities</p>
            <h2 className="text-3xl font-black text-white tracking-tight">Built for Depth, Not Just Speed</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => <FeatureCard key={i} {...f} i={i} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-6 text-center space-y-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/30">
            <Shield size={28} className="text-white" />
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight">Ready to Find the Logic Flaws?</h2>
          <p className="text-slate-400 leading-relaxed text-sm">
            Point LogicLens AI at any web target and watch your specialist security team get to work.
          </p>
          <div className="pt-4">
            <GradientButton onClick={() => navigate('/scan/new')} size="lg" icon={Zap}>
              Launch Your First Scan
            </GradientButton>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-10 bg-[#020305]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white tracking-wide">LogicLens AI</span>
          </div>
          <div className="flex items-center gap-6 text-[11px] font-mono text-slate-500">
            <span className="hover:text-cyan-400 cursor-pointer transition-colors">Documentation</span>
            <span>·</span>
            <span className="hover:text-cyan-400 cursor-pointer transition-colors">API Reference</span>
            <span>·</span>
            <span>v1.0.0</span>
          </div>
          <p className="text-[11px] text-slate-600">© {new Date().getFullYear()} LogicLens AI. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
