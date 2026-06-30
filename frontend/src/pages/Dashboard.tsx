import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocalChargesStats } from '../hooks/useLocalChargesStats';
import { useInspectionReportsStats } from '../hooks/useInspectionReportsStats';
import { useLocalCharges } from '../hooks/useLocalCharges';
import { useInspectionReports } from '../hooks/useInspectionReports';
import { useAuthStore } from '../stores/authStore';
import { hasPermission } from '../lib/permissions';
import { statusMap } from '../lib/constants';
import { 
  Plus, Eye, FileText, ClipboardList, TrendingUp, TrendingDown,
  Clock, ArrowRight, Activity, Trash2, Shield
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

const inspectionStatusMap: Record<string, { label: string; className: string }> = {
  '1': { label: 'Draft', className: 'badge-draft' },
  '2': { label: 'Done', className: 'badge-done' },
  '5': { label: 'Closed', className: 'badge bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
};

export default function Dashboard() {
  const currentUser = useAuthStore(state => state.user);
  const { t, language } = useTranslation();

  const { data: lcStats, isLoading: lcStatsLoading } = useLocalChargesStats();
  const { data: irStats, isLoading: irStatsLoading } = useInspectionReportsStats();

  // Fetch only the 5 most recent records
  const { data: recentLC, isLoading: recentLCLoading } = useLocalCharges(1, 5, '', 'fdCreatedAt', 'desc');
  const { data: recentIR, isLoading: recentIRLoading } = useInspectionReports(1, 5, '', 'fdCreatedAt', 'desc');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl p-8 text-white shadow-lg banner-gradient transition-all duration-500">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-wide mb-2 text-white">
              {t('dashboard_welcome', { name: currentUser?.name || 'User' })}
            </h1>
            <p className="text-white/90 text-sm max-w-xl leading-relaxed">
              {t('dashboard_subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/20 px-4 py-2 rounded-lg backdrop-blur-md border border-white/20 self-start md:self-auto shrink-0">
            <Clock size={20} className="text-white/90" />
            <span className="font-semibold tracking-wide text-sm text-white">
              {new Date().toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
        {/* Decorative background blur */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Local Charges Stat Card */}
        <div className="card p-6 border-l-4 border-l-tertiary flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-secondary uppercase tracking-wider mb-1">{t('dashboard_stat_lc')}</div>
              <div className="text-4xl font-bold text-primary">
                {lcStatsLoading ? <div className="h-10 w-24 skeleton mt-1" /> : lcStats?.totalForms || 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-tertiary/10 text-tertiary">
              <ClipboardList size={24} />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-secondary/10 pt-4">
            <span className="text-sm text-secondary">{t('dashboard_stat_lc_sub')}</span>
            {lcStats && lcStats.growthPercent !== undefined && (
              <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                lcStats.growthPercent >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
              }`}>
                {lcStats.growthPercent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {t('dashboard_growth', { pct: lcStats.growthPercent })}
              </div>
            )}
          </div>
        </div>

        {/* Inspection Reports Stat Card */}
        <div className="card p-6 border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-secondary uppercase tracking-wider mb-1">{t('dashboard_stat_ir')}</div>
              <div className="text-4xl font-bold text-primary">
                {irStatsLoading ? <div className="h-10 w-24 skeleton mt-1" /> : irStats?.totalForms || 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
              <FileText size={24} />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-secondary/10 pt-4">
            <span className="text-sm text-secondary">{t('dashboard_stat_ir_sub')}</span>
            {irStats && irStats.growthPercent !== undefined && (
              <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                irStats.growthPercent >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
              }`}>
                {irStats.growthPercent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {t('dashboard_growth', { pct: irStats.growthPercent })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
          <Activity size={20} className="text-tertiary" /> {t('dashboard_quick_actions')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {hasPermission(currentUser, 'local_charges:create') && (
            <Link to="/new" className="group card p-5 flex flex-col items-center justify-center text-center hover:bg-tertiary hover:text-white transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center mb-3 group-hover:bg-white/20 group-hover:text-white transition-all">
                <Plus size={24} />
              </div>
              <span className="font-semibold text-sm group-hover:text-white transition-colors">{t('dashboard_new_lc')}</span>
            </Link>
          )}
          {hasPermission(currentUser, 'inspection_reports:create') && (
            <Link to="/inspection-reports/new" className="group card p-5 flex flex-col items-center justify-center text-center hover:bg-emerald-500 hover:text-white transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3 group-hover:bg-white/20 group-hover:text-white transition-all">
                <FileText size={24} />
              </div>
              <span className="font-semibold text-sm group-hover:text-white transition-colors">{t('dashboard_new_ir')}</span>
            </Link>
          )}
          {hasPermission(currentUser, 'roles:read') && (
            <Link to="/roles" className="group card p-5 flex flex-col items-center justify-center text-center hover:bg-indigo-500 hover:text-white transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3 group-hover:bg-white/20 group-hover:text-white transition-all">
                <Shield size={24} />
              </div>
              <span className="font-semibold text-sm group-hover:text-white transition-colors">{t('dashboard_manage_roles')}</span>
            </Link>
          )}
          {hasPermission(currentUser, 'local_charges:delete') && (
            <Link to="/recycle-bin" className="group card p-5 flex flex-col items-center justify-center text-center hover:bg-rose-500 hover:text-white transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3 group-hover:bg-white/20 group-hover:text-white transition-all">
                <Trash2 size={24} />
              </div>
              <span className="font-semibold text-sm group-hover:text-white transition-colors">{t('dashboard_recycle_bin')}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Recent Work - Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        
        {/* Recent Local Charges */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <ClipboardList size={20} className="text-tertiary" /> {t('dashboard_recent_lc')}
            </h2>
            <Link to="/" className="text-sm font-semibold text-tertiary hover:text-tertiary/80 flex items-center gap-1 group">
              {t('dashboard_view_all')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary/15">
                <thead className="bg-neutral/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-[0.7rem] font-semibold text-secondary uppercase tracking-wider">{t('col_form_no')}</th>
                    <th className="px-4 py-3 text-left text-[0.7rem] font-semibold text-secondary uppercase tracking-wider">{t('col_customer')}</th>
                    <th className="px-4 py-3 text-left text-[0.7rem] font-semibold text-secondary uppercase tracking-wider">{t('col_status')}</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary/10">
                  {recentLCLoading ? (
                    <tr><td colSpan={4} className="p-8 text-center text-secondary text-sm">{t('state_loading')}</td></tr>
                  ) : recentLC?.data && recentLC.data.length > 0 ? (
                    recentLC.data.map(charge => {
                      const stat = statusMap[charge.fdStatus] || { label: 'Unknown', className: 'badge bg-secondary/10 text-secondary' };
                      return (
                        <tr key={charge.fdId} className="hover:bg-neutral/30 transition-colors group">
                          <td className="px-4 py-3 text-sm font-bold font-mono text-primary whitespace-nowrap">
                            {charge.fdNomorForm}
                          </td>
                          <td className="px-4 py-3 text-sm text-secondary truncate max-w-[150px]">
                            {charge.details?.[0]?.fdNamaCustomer || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <span className={stat.className}>{stat.label}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link to={`/form/${charge.fdId}`} className="text-secondary hover:text-tertiary p-1 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye size={18} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={4} className="p-8 text-center text-secondary text-sm">{t('state_no_charges')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Inspection Reports */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <FileText size={20} className="text-emerald-500" /> {t('dashboard_recent_ir')}
            </h2>
            <Link to="/inspection-reports" className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 group">
              {t('dashboard_view_all')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary/15">
                <thead className="bg-neutral/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-[0.7rem] font-semibold text-secondary uppercase tracking-wider">{t('col_report_no')}</th>
                    <th className="px-4 py-3 text-left text-[0.7rem] font-semibold text-secondary uppercase tracking-wider">{t('col_customer')}</th>
                    <th className="px-4 py-3 text-left text-[0.7rem] font-semibold text-secondary uppercase tracking-wider">{t('col_status')}</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary/10">
                  {recentIRLoading ? (
                    <tr><td colSpan={4} className="p-8 text-center text-secondary text-sm">{t('state_loading')}</td></tr>
                  ) : recentIR?.data && recentIR.data.length > 0 ? (
                    recentIR.data.map(report => {
                      const stat = inspectionStatusMap[report.fdStatus] || { label: 'Unknown', className: 'badge bg-secondary/10 text-secondary' };
                      return (
                        <tr key={report.fdId} className="hover:bg-neutral/30 transition-colors group">
                          <td className="px-4 py-3 text-sm font-bold font-mono text-primary whitespace-nowrap">
                            {report.fdReportNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-secondary truncate max-w-[150px]">
                            {report.fdNamaCustomer || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <span className={stat.className}>{stat.label}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link to={`/inspection-reports/${report.fdId}`} className="text-secondary hover:text-emerald-500 p-1 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye size={18} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={4} className="p-8 text-center text-secondary text-sm">{t('state_no_reports')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
