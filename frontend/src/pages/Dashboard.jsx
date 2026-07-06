import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Eye, Trash2, ShieldAlert, Activity, AlertTriangle, 
  TrendingUp, Clock, Zap, BarChart3 
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, PieChart, Pie, Cell 
} from 'recharts';
import { getScans, deleteScan } from '../services/api';
import GlassCard from '../components/ui/GlassCard';
import GradientButton from '../components/ui/GradientButton';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import EmptyState from '../components/ui/EmptyState';

const SEV_COLORS = { 
  CRITICAL: '#f87171', HIGH: '#fb923c', MEDIUM: '#fbbf24', 
  LOW: '#60a5fa', INFO: '#a78bfa' 
};

const AGENTS = [
  { name: 'Coordinator',     role: 'Orchestration',  icon: '👑', color: 'text-amber-400' },
  { name: 'Planner',         role: 'Strategy',       icon: '📋', color: 'text-cyan-400' },
  { name: 'Recon',           role: 'Footprinting',   icon: '🔍', color: 'text-emerald-400' },
  { name: 'Tech Fingerprint',role: 'Stack Analysis',  icon: '🏷️', color: 'text-violet-400' },
  { name: 'JS Analysis',     role: 'Code Audit',     icon: '📄', color: 'text-blue-400' },
  { name: 'API Discovery',   role: 'Endpoint Probe', icon: '🔌', color: 'text-fuchsia-400' },
  { name: 'Auth Testing',    role: 'Access Control', icon: '🔐', color: 'text-red-400' },
  { name: 'Business Logic',  role: 'Deep Analysis',  icon: '💼', color: 'text-amber-400' },
];

function StatCard({ label, value, icon: Icon, color, delay = 0 }) {
  const colorStyles = {
    cyan:    'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    violet:  'text-violet-400 bg-violet-500/10 border-violet-500/20',
    amber:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
    red:     'text-red-400 bg-red-500/10 border-red-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <GlassCard className="p-5" glow={color}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-black text-white tabular-nums">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorStyles[color]}`}>
            <Icon size={18} />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 font-mono mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-white font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  const stats = useMemo(() => ({
    total: scans.length,
    running: scans.filter(s => s.status === 'running').length,
    findings: scans.reduce((a, s) => a + (s.findings_count || 0), 0),
    critical: scans.reduce((a, s) => a + (s.report_data?.summary?.severity_distribution?.CRITICAL || 0), 0),
  }), [scans]);

  // Derive chart data from real scans
  const pieData = useMemo(() => {
    const dist = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };
    scans.forEach(s => {
      const d = s.report_data?.summary?.severity_distribution;
      if (d) {
        dist.Critical += d.CRITICAL || 0;
        dist.High += d.HIGH || 0;
        dist.Medium += d.MEDIUM || 0;
        dist.Low += d.LOW || 0;
        dist.Info += d.INFO || 0;
      }
    });
    return [
      { name: 'Critical', value: dist.Critical, color: SEV_COLORS.CRITICAL },
      { name: 'High',     value: dist.High,     color: SEV_COLORS.HIGH },
      { name: 'Medium',   value: dist.Medium,   color: SEV_COLORS.MEDIUM },
      { name: 'Low',      value: dist.Low,      color: SEV_COLORS.LOW },
      { name: 'Info',      value: dist.Info,      color: SEV_COLORS.INFO },
    ].filter(d => d.value > 0);
  }, [scans]);

  const trendData = useMemo(() => {
    // Build timeline from recent scans
    return scans.slice(0, 8).reverse().map((s) => ({
      name: `#${s.id}`,
      findings: s.findings_count || 0,
    }));
  }, [scans]);

  const load = async () => {
    try {
      setLoading(true);
      setScans(await getScans());
    } catch (e) {
      console.error('Failed to load scans:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this scan and all its data?')) return;
    try { await deleteScan(id); load(); } catch {}
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <LoadingSkeleton variant="stat" count={4} />
        </div>
        <LoadingSkeleton variant="card" count={2} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">AI Security Operations Center</p>
        </div>
        <GradientButton 
          icon={Plus} 
          onClick={() => navigate('/scan/new')}
        >
          New Scan
        </GradientButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Scans" value={stats.total} icon={Activity} color="cyan" delay={0} />
        <StatCard label="Running" value={stats.running} icon={Zap} color="violet" delay={0.05} />
        <StatCard label="Findings" value={stats.findings} icon={AlertTriangle} color="amber" delay={0.1} />
        <StatCard label="Critical" value={stats.critical} icon={ShieldAlert} color="red" delay={0.15} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-5">
        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-cyan-400" />
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Findings Trend</p>
            </div>
            <p className="text-xs text-slate-600 font-mono">Per Scan</p>
          </div>
          <div className="h-52">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="findingsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#334155" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#334155" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="findings" stroke="#22d3ee" strokeWidth={2} fill="url(#findingsGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-slate-600">No scan data yet</p>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={14} className="text-violet-400" />
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Severity</p>
          </div>
          <div className="h-40 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-600">No findings yet</p>
            )}
          </div>
          {pieData.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
              {pieData.map(p => (
                <div key={p.name} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.color }} />
                  <span>{p.name}</span>
                  <span className="ml-auto font-mono text-white font-semibold">{p.value}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Scan history */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scan History</p>
            <p className="text-xs text-slate-600 font-mono">{scans.length} total</p>
          </div>

          {scans.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No scans yet"
              description="Launch your first AI-powered security assessment to see results here."
              action={{ label: 'New Scan', onClick: () => navigate('/scan/new') }}
            />
          ) : (
            <GlassCard className="overflow-hidden p-0" hover={false}>
              <div className="divide-y divide-white/5">
                {scans.map((scan) => (
                  <motion.div
                    key={scan.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => navigate(scan.status === 'running' ? `/scan/${scan.id}` : `/scan/${scan.id}/report`)}
                    className="p-4 flex items-center gap-4 hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <StatusBadge status={scan.status} />
                        <span className="text-xs font-mono text-slate-600">#SCAN-{scan.id}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
                        {scan.target_url}
                      </p>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle size={11} className="text-amber-500" />
                          {scan.findings_count} findings
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={11} />
                          {new Date(scan.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(scan.status === 'running' ? `/scan/${scan.id}` : `/scan/${scan.id}/report`); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white border border-white/8 hover:border-white/15 bg-white/[0.03] hover:bg-white/[0.06] transition-all"
                      >
                        <Eye size={12} /> View
                      </button>
                      <button
                        onClick={(e) => handleDelete(scan.id, e)}
                        className="p-1.5 rounded-lg text-red-500/50 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Agent Team */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agent Team</p>
          <div className="space-y-2">
            {AGENTS.map((agent, i) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <GlassCard className="p-3.5 flex items-center gap-3" hover={true}>
                  <span className="text-lg shrink-0">{agent.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-200 truncate">{agent.name}</p>
                    <p className="text-xs text-slate-500">{agent.role}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
                    <span className="text-xs text-slate-600">Idle</span>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
