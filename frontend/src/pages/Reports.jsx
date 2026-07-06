import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Eye, AlertTriangle, Trash2, Calendar } from 'lucide-react';
import { getScans, deleteScan } from '../services/api';
import GlassCard from '../components/ui/GlassCard';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

export default function Reports() {
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const load = async () => {
    try {
      setLoading(true);
      const data = await getScans();
      setScans(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report?')) return;
    try { await deleteScan(id); load(); } catch {}
  };

  // Only show completed/failed scans in reports list
  const reportScans = scans.filter(s => s.status === 'completed' || s.status === 'failed');

  const filtered = reportScans.filter(s => {
    const matchesSearch = s.target_url.toLowerCase().includes(search.toLowerCase()) || s.id.toString().includes(search);
    if (filter === 'critical') return matchesSearch && (s.report_data?.summary?.severity_distribution?.CRITICAL > 0);
    if (filter === 'failed') return matchesSearch && s.status === 'failed';
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Security Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Browse and export historical assessment data.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <GlassCard className="p-1.5 flex items-center gap-2 min-w-[240px]" hover={false}>
            <Search size={16} className="text-slate-500 ml-2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search target or ID..."
              className="bg-transparent border-none text-sm text-white placeholder-slate-500 focus:outline-none w-full"
            />
          </GlassCard>
          
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="glass h-[42px] px-4 rounded-xl text-sm text-slate-300 font-medium focus:outline-none cursor-pointer appearance-none pr-8 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWxpbmUgcG9pbnRzPSI2IDkgMTIgMTUgMTggOSI+PC9wb2x5bGluZT48L3N2Zz4=')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em]"
          >
            <option value="all">All Reports</option>
            <option value="critical">Has Critical</option>
            <option value="failed">Failed Scans</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton variant="row" count={5} />
        </div>
      ) : reportScans.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports available"
          description="Complete a scan to generate your first security report."
          action={{ label: 'New Scan', onClick: () => navigate('/scan/new') }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No results found"
          description="Try adjusting your search query or filters."
        />
      ) : (
        <div className="grid gap-4">
          {filtered.map((scan) => {
            const hasCritical = scan.report_data?.summary?.severity_distribution?.CRITICAL > 0;
            return (
              <GlassCard key={scan.id} className="p-4" glow={hasCritical ? 'red' : 'cyan'}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <FileText size={20} className={hasCritical ? 'text-red-400' : 'text-cyan-400'} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-slate-500">#SCAN-{scan.id}</span>
                        <StatusBadge status={scan.status} />
                        {hasCritical && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 uppercase">
                            Critical Risk
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-white truncate">{scan.target_url}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {new Date(scan.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle size={14} className={hasCritical ? 'text-amber-500' : ''} />
                        {scan.findings_count} findings
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/scan/${scan.id}/report`)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all">
                        <Eye size={14} /> View
                      </button>
                      <button onClick={() => handleDelete(scan.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
