import React from 'react';
import {
  TrendingUp, TrendingDown, FileText, CheckCircle2, Clock,
  Users, BarChart2, Minus
} from 'lucide-react';
import type { StatsData } from '../hooks/useLocalChargesStats';

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  sub?: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="card p-3.5 flex flex-col justify-between hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 min-h-[110px]">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="text-[0.7rem] text-secondary font-medium uppercase tracking-wider truncate" title={label}>{label}</div>
          <div className="text-[1.4rem] font-bold text-primary leading-none tracking-tight">
            {value}
          </div>
        </div>
        <div className={`p-2 rounded-lg ${accent} shrink-0`}>
          <Icon size={18} />
        </div>
      </div>
      
      {(sub || trend !== undefined) && (
        <div className="mt-3 pt-2 border-t border-secondary/10 flex items-center justify-between gap-2 flex-wrap">
          {sub && <div className="text-[0.65rem] text-secondary/60 truncate" title={sub}>{sub}</div>}
          {trend !== undefined && (
            <div
              className={`flex items-center gap-1 text-[0.65rem] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                trend.value > 0
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : trend.value < 0
                  ? 'bg-rose-500/10 text-rose-500'
                  : 'bg-secondary/10 text-secondary'
              }`}
            >
              {trend.value > 0 ? (
                <TrendingUp size={10} />
              ) : trend.value < 0 ? (
                <TrendingDown size={10} />
              ) : (
                <Minus size={10} />
              )}
              {trend.value > 0 ? '+' : ''}
              {trend.value}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Mini Bar Chart (no library needed) ───────────────────────────────────────
function MiniBarChart({ data }: { data: StatsData['monthlyTrend'] }) {
  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map((d: { month: string; count: number }) => d.count), 1);

  const monthLabel = (ym: string) => {
    const [year, month] = ym.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1);
    return d.toLocaleDateString('id-ID', { month: 'short' });
  };

  return (
    <div className="flex items-end gap-1.5 h-16 w-full">
      {data.map((d: { month: string; count: number }, i: number) => {
        const pct = Math.max((d.count / maxCount) * 100, 4);
        const isLast = i === data.length - 1;
        return (
          <div key={d.month} className="flex flex-col items-center gap-1 flex-1 h-full justify-end group">
            <div className="relative w-full flex justify-center">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-surface border border-secondary/20 rounded-md px-2 py-1 shadow-lg text-center">
                  <div className="text-[0.75rem] font-bold text-primary whitespace-nowrap">{d.count} form</div>
                </div>
                <div className="w-2 h-2 bg-surface border-b border-r border-secondary/20 rotate-45 -mt-1" />
              </div>
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${isLast ? 'bg-tertiary' : 'bg-tertiary/40 group-hover:bg-tertiary/60'}`}
                style={{ height: `${pct}%` }}
              />
            </div>
            <div className={`text-[0.62rem] font-medium whitespace-nowrap ${isLast ? 'text-tertiary' : 'text-secondary/60'}`}>
              {monthLabel(d.month)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Status Donut (CSS only) ──────────────────────────────────────────────────
function StatusBreakdown({ byStatus }: { byStatus: Record<string, number> }) {
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    Draft: { color: 'bg-amber-400', bg: 'bg-amber-400/10', label: 'Draft' },
    Done: { color: 'bg-emerald-500', bg: 'bg-emerald-500/10', label: 'Done' },
  };

  if (total === 0) {
    return <div className="text-center text-secondary text-sm py-4">Belum ada data</div>;
  }

  return (
    <div className="space-y-2.5">
      {Object.entries(byStatus).map(([status, count]) => {
        const cfg = statusConfig[status] || { color: 'bg-secondary', bg: 'bg-secondary/10', label: status };
        const pct = Math.round((count / total) * 100);
        return (
          <div key={status} className="space-y-1">
            <div className="flex items-center justify-between text-[0.8rem]">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
                <span className="font-medium text-primary">{cfg.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-secondary">{count}</span>
                <span className={`text-[0.7rem] font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color.replace('bg-', 'text-')}`}>
                  {pct}%
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-secondary/10 rounded-full overflow-hidden">
              <div
                className={`h-full ${cfg.color} rounded-full transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Top Customers ────────────────────────────────────────────────────────────
function TopCustomersList({ customers }: { customers: StatsData['topCustomers'] }) {
  if (!customers || customers.length === 0) {
    return <div className="text-center text-secondary text-sm py-4">Belum ada data</div>;
  }
  const max = Math.max(...customers.map((c: { name: string | null; count: number }) => c.count), 1);

  return (
    <div className="space-y-2">
      {customers.map((c: { name: string | null; count: number }, i: number) => (
        <div key={i} className="flex items-center gap-3 group">
          <span className="text-[0.7rem] font-mono font-bold text-secondary/50 w-4 shrink-0">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[0.82rem] font-semibold text-primary truncate">{c.name || '—'}</span>
              <span className="text-[0.75rem] font-mono text-secondary shrink-0 ml-2">{c.count}×</span>
            </div>
            <div className="h-1 bg-secondary/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-tertiary/70 rounded-full transition-all duration-700"
                style={{ width: `${(c.count / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Analytics Section ───────────────────────────────────────────────────
export default function AnalyticsSection({ stats, isLoading }: {
  stats: StatsData | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 h-20 skeleton" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 h-36 skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const draftCount = stats.byStatus['Draft'] || 0;
  const doneCount = stats.byStatus['Done'] || 0;

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Form"
          value={(stats.totalForms || 0).toLocaleString()}
          icon={FileText}
          accent="bg-tertiary/10 text-tertiary"
        />
        <StatCard
          label="Bulan Ini"
          value={(stats.totalThisMonth || 0).toLocaleString()}
          icon={BarChart2}
          accent="bg-blue-500/10 text-blue-500"
          sub={`vs ${stats.totalLastMonth || 0} bulan lalu`}
          trend={{ value: stats.growthPercent || 0, label: 'vs last month' }}
        />
        <StatCard
          label="Draft"
          value={(draftCount || 0).toLocaleString()}
          icon={Clock}
          accent="bg-amber-400/10 text-amber-500"
          sub="Belum selesai"
        />
        <StatCard
          label="Done"
          value={(doneCount || 0).toLocaleString()}
          icon={CheckCircle2}
          accent="bg-emerald-500/10 text-emerald-500"
          sub="Sudah selesai"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Monthly Trend */}
        <div className="card p-4 sm:col-span-1 flex flex-col gap-3">
          <div>
            <div className="text-[0.7rem] font-semibold text-secondary uppercase tracking-wider">Tren 6 Bulan</div>
            <div className="text-[1.1rem] font-bold text-primary mt-0.5">Form per Bulan</div>
          </div>
          <MiniBarChart data={stats.monthlyTrend} />
        </div>

        {/* Status Breakdown */}
        <div className="card p-4 flex flex-col gap-3">
          <div>
            <div className="text-[0.7rem] font-semibold text-secondary uppercase tracking-wider">Distribusi Status</div>
            <div className="text-[1.1rem] font-bold text-primary mt-0.5">Breakdown</div>
          </div>
          <StatusBreakdown byStatus={stats.byStatus} />
          <div className="mt-auto pt-2 border-t border-secondary/10 flex items-center justify-between text-[0.75rem] text-secondary">
            <span>Total</span>
            <span className="font-bold text-primary">{stats.totalForms} form</span>
          </div>
        </div>

        {/* Top Customers */}
        <div className="card p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-tertiary" />
            <div>
              <div className="text-[0.7rem] font-semibold text-secondary uppercase tracking-wider">Customer Teratas</div>
              <div className="text-[1.1rem] font-bold text-primary mt-0.5">Top 5</div>
            </div>
          </div>
          <TopCustomersList customers={stats.topCustomers} />
        </div>
      </div>
    </div>
  );
}
