import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInspectionReports } from '../../../hooks/useInspectionReports';
import { Search, Eye, Plus, ArrowRight, ClipboardList, LayoutList, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, User, Clock } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';
import { useAuthStore } from '../../../stores/authStore';
import { hasPermission } from '../../../lib/permissions';
import AnalyticsSection from '../../../components/AnalyticsSection';
import { useInspectionReportsStats } from '../../../hooks/useInspectionReportsStats';
import { useTranslation } from '../../../hooks/useTranslation';
import { statusMap } from '../../../lib/constants';
import SortIcon from '../../../components/ui/SortIcon';


export default function InspectionReportsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('fdCreatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState(20);
  const [showAnalytics, setShowAnalytics] = useState(true);

  const currentUser = useAuthStore(state => state.user);
  const { t, language } = useTranslation();
  
  const debouncedSearch = useDebounce(search, 500);
  const { data, isLoading, isError } = useInspectionReports(page, limit, debouncedSearch, sortBy, sortOrder);
  const { data: stats, isLoading: statsLoading } = useInspectionReportsStats();

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2 border-b border-secondary/10">
        <div>
          <h1 className="text-[2.6rem] font-display text-primary tracking-[-0.02em] leading-none mb-2">
            {t('ir_title')}
          </h1>
          <p className="text-[0.95rem] text-secondary">
            {t('ir_subtitle')}
          </p>
        </div>
        {hasPermission(currentUser, 'inspection_reports:create') && (
          <Link
            to="/inspection-reports/new"
            className="btn-primary inline-flex items-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus size={18} />
            {t('ir_new_btn')}
          </Link>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 mb-2">
        <h2 className="text-xl font-bold font-display text-primary flex items-center gap-2">
          {t('ir_overview')}
        </h2>
        <button 
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="text-sm font-medium text-secondary hover:text-primary transition-colors flex items-center gap-1 bg-surface border border-secondary/20 px-3 py-1.5 rounded-full shadow-sm hover:shadow active:scale-95"
        >
          {showAnalytics ? (
            <><ChevronUp size={14} /> {t('ir_hide_analytics')}</>
          ) : (
            <><ChevronDown size={14} /> {t('ir_show_analytics')}</>
          )}
        </button>
      </div>

      {showAnalytics && (
        <AnalyticsSection stats={stats as any} isLoading={statsLoading} />
      )}

      <div className="card p-4 flex flex-col sm:flex-row gap-4 items-center justify-between sticky top-4 z-20 shadow-lg border-secondary/20 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="relative w-full flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
            <Search size={18} />
          </div>
          <input
            type="text"
            className="form-input pl-10 w-full"
            placeholder={t('ir_search_placeholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2 border border-secondary/20 rounded-lg p-1 shrink-0 self-end sm:self-auto">
          <div className="flex items-center pl-2 pr-2 border-r border-secondary/20">
            <span className="text-[0.75rem] text-secondary font-medium mr-2 hidden sm:inline">{t('ir_per_page')}</span>
            <select
              className="text-sm bg-transparent font-medium text-primary cursor-pointer focus:outline-none"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <button className="p-1.5 rounded-md bg-tertiary/10 text-tertiary">
            <LayoutList size={18} />
          </button>
        </div>
      </div>

      <div className="bg-surface shadow-md border border-secondary/20 rounded-lg overflow-hidden transition-all duration-300">
        {/* Desktop table — hidden on mobile, avoids horizontal scroll */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary/20">
            <thead className="bg-neutral/50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase cursor-pointer select-none group hover:bg-secondary/5 transition-colors"
                  onClick={() => handleSort('fdReportNumber')}
                >
                  <span className="flex items-center gap-1.5">
                    {t('col_report_no')}
                    <SortIcon field="fdReportNumber" sortBy={sortBy} sortOrder={sortOrder} />
                  </span>
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase cursor-pointer select-none group hover:bg-secondary/5 transition-colors"
                  onClick={() => handleSort('fdReportDate')}
                >
                  <span className="flex items-center gap-1.5">
                    {t('col_report_date')}
                    <SortIcon field="fdReportDate" sortBy={sortBy} sortOrder={sortOrder} />
                  </span>
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase cursor-pointer select-none group hover:bg-secondary/5 transition-colors"
                  onClick={() => handleSort('fdNamaCustomer')}
                >
                  <span className="flex items-center gap-1.5">
                    {t('col_customer')}
                    <SortIcon field="fdNamaCustomer" sortBy={sortBy} sortOrder={sortOrder} />
                  </span>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">
                  {t('col_marking_info')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase cursor-pointer select-none group hover:bg-secondary/5 transition-colors"
                  onClick={() => handleSort('fdStatus')}
                >
                  <span className="flex items-center gap-1.5">
                    {t('col_status')}
                    <SortIcon field="fdStatus" sortBy={sortBy} sortOrder={sortOrder} />
                  </span>
                </th>
                <th scope="col" className="px-6 py-4 text-right text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">{t('col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary/15">
              {isLoading ? (
                Array.from({ length: limit }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-5 w-24 skeleton" /></td>
                    <td className="px-6 py-5"><div className="h-5 w-24 skeleton" /></td>
                    <td className="px-6 py-5"><div className="h-5 w-44 skeleton" /></td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5">
                        <div className="h-4 w-36 skeleton" />
                        <div className="h-4 w-28 skeleton" />
                      </div>
                    </td>
                    <td className="px-6 py-5"><div className="h-6 w-16 skeleton" /></td>
                    <td className="px-6 py-5 text-right"><div className="inline-block h-6 w-12 skeleton" /></td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-rose-500 font-medium">
                    {t('ir_err_fetch')}
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="w-16 h-16 bg-neutral rounded-full flex items-center justify-center mb-4 border border-secondary/20">
                        <ClipboardList className="w-8 h-8 text-secondary" />
                      </div>
                      <h3 className="text-lg font-semibold text-primary mb-1">{t('ir_empty_title')}</h3>
                      <p className="text-secondary text-sm leading-relaxed mb-4">
                        {t('ir_empty_desc')}
                      </p>
                      {hasPermission(currentUser, 'local_charges:create') && (
                        <Link to="/inspection-reports/new" className="btn-secondary py-2 px-4 text-sm flex items-center gap-1.5">
                          <Plus size={16} /> {t('ir_create_btn')}
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data.map((report) => {
                  const statusInfo = statusMap[report.fdStatus] || { label: 'Unknown', className: 'badge bg-secondary/15 text-secondary border-secondary/25' };
                  return (
                    <tr key={report.fdId} className="hover:bg-neutral/40 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-[0.95rem] font-semibold text-primary">
                        {report.fdReportNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[0.9rem] text-secondary">
                        {new Date(report.fdReportDate).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[0.95rem] text-secondary">
                        <span className="font-medium text-primary">{report.fdNamaCustomer || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[0.9rem] text-secondary">
                        <div className="flex flex-col gap-0.5 font-mono text-[0.8rem]">
                          <span className="flex items-center gap-1">
                            <span className="text-secondary/60">MKR NO:</span>
                            <span className="font-semibold text-primary">{report.fdMarkingNo}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-secondary/60">MKR CODE:</span>
                            <span className="font-semibold text-primary">{report.fdMarkingCode}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={statusInfo.className}>
                          {statusInfo.key ? (t as any)(statusInfo.key) : statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-[0.95rem] font-medium">
                        <div className="flex items-center justify-end">
                          <Link
                            to={`/inspection-reports/${report.fdId}`}
                            className="p-1.5 text-secondary hover:text-tertiary hover:bg-tertiary/10 rounded-md transition-all duration-150 flex items-center gap-1 text-[0.85rem]"
                            title="View/Edit Details"
                          >
                            <Eye size={18} />
                            <span className="hidden sm:inline">{t('ir_details_btn')}</span>
                            <ArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile short-list — compact single-column rows, no horizontal scroll */}
        <div className="md:hidden divide-y divide-secondary/15">
          {isLoading ? (
            Array.from({ length: Math.min(limit, 6) }).map((_, index) => (
              <div key={index} className="px-4 py-3.5 animate-pulse flex items-center gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 skeleton" />
                  <div className="h-3.5 w-44 skeleton" />
                  <div className="h-3 w-24 skeleton" />
                </div>
                <div className="h-6 w-16 skeleton rounded-full shrink-0" />
              </div>
            ))
          ) : isError ? (
            <div className="px-4 py-10 text-center text-sm text-rose-500 font-medium">
              {t('ir_err_fetch')}
            </div>
          ) : data?.data.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <div className="flex flex-col items-center justify-center max-w-xs mx-auto">
                <div className="w-14 h-14 bg-neutral rounded-full flex items-center justify-center mb-3 border border-secondary/20">
                  <ClipboardList className="w-7 h-7 text-secondary" />
                </div>
                <h3 className="text-base font-semibold text-primary mb-1">{t('ir_empty_title')}</h3>
                <p className="text-secondary text-sm leading-relaxed mb-4">
                  {t('ir_empty_desc')}
                </p>
                {hasPermission(currentUser, 'local_charges:create') && (
                  <Link to="/inspection-reports/new" className="btn-secondary py-2 px-4 text-sm flex items-center gap-1.5">
                    <Plus size={16} /> {t('ir_create_btn')}
                  </Link>
                )}
              </div>
            </div>
          ) : (
            data?.data.map((report) => {
              const statusInfo = statusMap[report.fdStatus] || { label: 'Unknown', className: 'badge bg-secondary/15 text-secondary border-secondary/25' };
              return (
                <Link
                  key={report.fdId}
                  to={`/inspection-reports/${report.fdId}`}
                  className="flex items-center gap-3 px-4 py-3.5 active:bg-neutral/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[0.92rem] font-semibold text-primary truncate">
                        {report.fdReportNumber}
                      </span>
                      <span className={`shrink-0 ${statusInfo.className}`}>
                        {statusInfo.key ? (t as any)(statusInfo.key) : statusInfo.label}
                      </span>
                    </div>
                    <div className="text-[0.85rem] text-secondary truncate">
                      {report.fdNamaCustomer || '-'}
                    </div>
                    <div className="flex items-center gap-2.5 mt-1 text-[0.72rem] text-secondary/70 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock size={11} className="shrink-0" />
                        {new Date(report.fdReportDate).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      {report.fdMarkingNo && (
                        <span className="truncate">MKR: <span className="font-semibold text-secondary">{report.fdMarkingNo}</span></span>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-secondary/40 shrink-0" />
                </Link>
              );
            })
          )}
        </div>

        {/* Pagination Section */}
        {data?.meta && data.meta.total > 0 && (
          <div className="px-4 sm:px-6 py-4 bg-surface border-t border-secondary/20">
            <div className="flex-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-[0.82rem] sm:text-[0.9rem] text-secondary text-center sm:text-left order-2 sm:order-1">
                {t('pagination_showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, data.meta.total), total: data.meta.total })}
              </p>
              <div className="flex items-center justify-between gap-2 order-1 sm:order-2 sm:justify-start">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label={t('pagination_prev')}
                  className="btn-secondary p-2.5 sm:px-3.5 sm:py-2 text-sm disabled:opacity-30 shrink-0 flex items-center justify-center"
                >
                  <ChevronLeft size={16} className="sm:hidden" />
                  <span className="hidden sm:inline">{t('pagination_prev')}</span>
                </button>
                <div className="font-mono text-[0.8rem] sm:text-sm text-secondary shrink-0 whitespace-nowrap text-center flex-1 sm:flex-none sm:px-3">
                  {t('pagination_page', { page, total: data.meta.totalPages })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                  disabled={page >= data.meta.totalPages}
                  aria-label={t('pagination_next')}
                  className="btn-secondary p-2.5 sm:px-3.5 sm:py-2 text-sm disabled:opacity-30 shrink-0 flex items-center justify-center"
                >
                  <ChevronRight size={16} className="sm:hidden" />
                  <span className="hidden sm:inline">{t('pagination_next')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
