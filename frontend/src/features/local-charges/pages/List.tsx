import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocalCharges } from '../../../hooks/useLocalCharges';
import { useLocalChargesStats } from '../../../hooks/useLocalChargesStats';
import { Search, Eye, Plus, ArrowRight, ClipboardList, LayoutList, LayoutGrid, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, User, Clock, FileSearch as FileSearchIcon } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';
import { useAuthStore } from '../../../stores/authStore';
import AnalyticsSection from '../../../components/AnalyticsSection';
import { useTranslation } from '../../../hooks/useTranslation';
import PullInvoiceDialog from '../../../components/PullInvoiceDialog';
import SortIcon from '../../../components/ui/SortIcon';

import { hasPermission } from '../../../lib/permissions';
import { statusMap } from '../../../lib/constants';


export default function LocalChargesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState('fdCreatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState(10);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [pullInvoiceTarget, setPullInvoiceTarget] = useState<{ id: number; nomorForm: string } | null>(null);

  const currentUser = useAuthStore(state => state.user);
  const { t, language } = useTranslation();
  const { data: stats, isLoading: statsLoading } = useLocalChargesStats();
  
  const debouncedSearch = useDebounce(search, 500);
  const { data, isLoading, isError } = useLocalCharges(page, limit, debouncedSearch, sortBy, sortOrder);

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
      {/* Header section with modern flex spacing */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2 border-b border-secondary/10">
        <div>
          <h1 className="text-[2.6rem] font-display text-primary tracking-[-0.02em] leading-none mb-2">
            {t('lc_title')}
          </h1>
          <p className="text-[0.95rem] text-secondary">
            {t('lc_subtitle')}
          </p>
        </div>
        {hasPermission(currentUser, 'local_charges:create') && (
          <Link
            to="/new"
            className="btn-primary inline-flex items-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus size={18} />
            {t('lc_new_btn')}
          </Link>
        )}
      </div>

      {/* Analytics Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[1.2rem] font-semibold text-primary">{t('lc_overview')}</h2>
          <button 
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="text-sm font-medium text-secondary hover:text-primary flex items-center gap-1.5 transition-colors"
          >
            {showAnalytics ? (
              <><ChevronUp size={16} /> {t('lc_hide_analytics')}</>
            ) : (
              <><ChevronDown size={16} /> {t('lc_show_analytics')}</>
            )}
          </button>
        </div>
        <div 
          className={`grid transition-all duration-300 ease-in-out ${
            showAnalytics ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <AnalyticsSection stats={stats} isLoading={statsLoading} />
          </div>
        </div>
      </div>

      {/* Modern Card for Search/Filter */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4 items-center justify-between sticky top-4 z-20 shadow-lg border-secondary/20 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="relative w-full flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
            <Search size={18} />
          </div>
          <input
            type="text"
            className="form-input pl-10 w-full"
            placeholder={t('lc_search_placeholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2 border border-secondary/20 rounded-lg p-1 shrink-0 self-end sm:self-auto">
          <div className="flex items-center pl-2 pr-2 border-r border-secondary/20">
            <span className="text-[0.75rem] text-secondary font-medium mr-2 hidden sm:inline">{t('lc_per_page')}</span>
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
              <option value={100}>100</option>
            </select>
          </div>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-tertiary/10 text-tertiary' : 'text-secondary hover:bg-neutral/50'}`}
            title="List View"
          >
            <LayoutList size={18} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-tertiary/10 text-tertiary' : 'text-secondary hover:bg-neutral/50'}`}
            title="Grid View"
          >
            <LayoutGrid size={18} />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className={`transition-all duration-300 ${viewMode === 'table' ? 'bg-surface shadow-md border border-secondary/20 rounded-lg overflow-hidden' : 'space-y-6'}`}>

        {viewMode === 'table' ? (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary/20">
              <thead className="bg-neutral/50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase cursor-pointer select-none group hover:bg-secondary/5 transition-colors"
                    onClick={() => handleSort('fdNomorForm')}
                  >
                    <span className="flex items-center gap-1.5">
                      {t('col_form_no')}
                      <SortIcon field="fdNomorForm" sortBy={sortBy} sortOrder={sortOrder} />
                    </span>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase cursor-pointer select-none group hover:bg-secondary/5 transition-colors"
                    onClick={() => handleSort('fdCreatedAt')}
                  >
                    <span className="flex items-center gap-1.5">
                      {t('col_date_created')}
                      <SortIcon field="fdCreatedAt" sortBy={sortBy} sortOrder={sortOrder} />
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
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase cursor-pointer select-none group hover:bg-secondary/5 transition-colors"
                    onClick={() => handleSort('fdNoInputan')}
                  >
                    <span className="flex items-center gap-1.5">
                      No. Inputan
                      <SortIcon field="fdNoInputan" sortBy={sortBy} sortOrder={sortOrder} />
                    </span>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">Refs (Marking/Receipt/Bill)</th>
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
                      <td className="px-6 py-5"><div className="h-5 w-28 skeleton" /></td>
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
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-rose-500 font-medium">
                      {t('lc_err_fetch')}
                    </td>
                  </tr>
                ) : data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                        <div className="w-16 h-16 bg-neutral rounded-full flex items-center justify-center mb-4 border border-secondary/20">
                          <ClipboardList className="w-8 h-8 text-secondary" />
                        </div>
                        <h3 className="text-lg font-semibold text-primary mb-1">{t('lc_empty_title')}</h3>
                        <p className="text-secondary text-sm leading-relaxed mb-4">
                          {t('lc_empty_desc')}
                        </p>
                        {hasPermission(currentUser, 'local_charges:create') && (
                          <Link to="/new" className="btn-secondary py-2 px-4 text-sm flex items-center gap-1.5">
                            <Plus size={16} /> {t('lc_create_btn')}
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  data?.data.map((charge) => {
                    const statusInfo = statusMap[charge.fdStatus] || { label: 'Unknown', className: 'badge bg-secondary/15 text-secondary border-secondary/25' };
                    return (
                      <tr key={charge.fdId} className="hover:bg-neutral/40 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-[0.95rem] font-semibold text-primary">
                          {charge.fdNomorForm}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[0.9rem] text-secondary">
                          {new Date(charge.fdCreatedAt).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[0.95rem] text-secondary">
                          <span className="font-medium text-primary">{charge.details?.[0]?.fdNamaCustomer || '-'}</span>
                          {charge.details?.length > 1 && (
                            <span className="ml-2 text-[0.72rem] bg-tertiary/10 text-tertiary px-1.5 py-0.5 rounded font-mono font-bold tracking-wide uppercase">
                              +{charge.details.length - 1} More
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[0.95rem] font-mono text-secondary">
                          {charge.details?.[0]?.fdNoInputan || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[0.9rem] text-secondary">
                          <div className="flex flex-col gap-0.5 font-mono text-[0.8rem]">
                            {charge.details?.[0]?.fdMarking && (
                              <span className="flex items-center gap-1">
                                <span className="text-secondary/60">MKR:</span>
                                <span className="font-semibold text-primary">{charge.details[0].fdMarking}</span>
                              </span>
                            )}
                            {charge.details?.[0]?.fdNoReceipt && (
                              <span className="flex items-center gap-1">
                                <span className="text-secondary/60">RCT:</span>
                                <span className="font-semibold text-primary">{charge.details[0].fdNoReceipt}</span>
                              </span>
                            )}
                            {charge.details?.[0]?.fdNoBilling && (
                              <span className="flex items-center gap-1">
                                <span className="text-secondary/60">BIL:</span>
                                <span className="font-semibold text-primary">{charge.details[0].fdNoBilling}</span>
                              </span>
                            )}
                            {(!charge.details?.[0]?.fdMarking && !charge.details?.[0]?.fdNoReceipt && !charge.details?.[0]?.fdNoBilling) && (
                              <span className="text-secondary/40">ΓÇö</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={statusInfo.className}>
                            {statusInfo.key ? (t as any)(statusInfo.key) : statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-[0.95rem] font-medium">
                          <div className="flex items-center justify-end gap-1">
                            {charge.fdStatus !== 2 && hasPermission(currentUser, 'local_charges:pull_invoice') && (
                              <button
                                type="button"
                                onClick={() => setPullInvoiceTarget({ id: charge.fdId, nomorForm: charge.fdNomorForm })}
                                className="p-1.5 text-secondary hover:text-tertiary hover:bg-tertiary/10 rounded-md transition-all duration-150"
                                title="Pull Invoice"
                              >
                                <FileSearchIcon size={18} />
                              </button>
                            )}
                            <Link
                              to={`/form/${charge.fdId}`}
                              className="p-1.5 text-secondary hover:text-tertiary hover:bg-tertiary/10 rounded-md transition-all duration-150 flex items-center gap-1 text-[0.85rem]"
                              title="View/Edit Details"
                            >
                              <Eye size={18} />
                              <span className="hidden sm:inline">{t('lc_view_details')}</span>
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
                    <div className="h-3 w-28 skeleton" />
                  </div>
                  <div className="h-6 w-16 skeleton rounded-full shrink-0" />
                </div>
              ))
            ) : isError ? (
              <div className="px-4 py-10 text-center text-sm text-rose-500 font-medium">
                {t('lc_err_fetch')}
              </div>
            ) : data?.data.length === 0 ? (
              <div className="px-4 py-14 text-center">
                <div className="flex flex-col items-center justify-center max-w-xs mx-auto">
                  <div className="w-14 h-14 bg-neutral rounded-full flex items-center justify-center mb-3 border border-secondary/20">
                    <ClipboardList className="w-7 h-7 text-secondary" />
                  </div>
                  <h3 className="text-base font-semibold text-primary mb-1">{t('lc_empty_title')}</h3>
                  <p className="text-secondary text-sm leading-relaxed mb-4">
                    {t('lc_empty_desc')}
                  </p>
                  {hasPermission(currentUser, 'local_charges:create') && (
                    <Link to="/new" className="btn-secondary py-2 px-4 text-sm flex items-center gap-1.5">
                      <Plus size={16} /> {t('lc_create_btn')}
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              data?.data.map((charge) => {
                const statusInfo = statusMap[charge.fdStatus] || { label: 'Unknown', className: 'badge bg-secondary/15 text-secondary border-secondary/25' };
                const refs = [
                  charge.details?.[0]?.fdMarking && `MKR: ${charge.details[0].fdMarking}`,
                  charge.details?.[0]?.fdNoReceipt && `RCT: ${charge.details[0].fdNoReceipt}`,
                  charge.details?.[0]?.fdNoBilling && `BIL: ${charge.details[0].fdNoBilling}`,
                ].filter(Boolean) as string[];
                return (
                  <Link
                    key={charge.fdId}
                    to={`/form/${charge.fdId}`}
                    className="flex items-center gap-3 px-4 py-3.5 active:bg-neutral/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[0.92rem] font-semibold text-primary truncate">
                          {charge.fdNomorForm}
                        </span>
                        <span className={`shrink-0 ${statusInfo.className}`}>
                          {statusInfo.key ? (t as any)(statusInfo.key) : statusInfo.label}
                        </span>
                      </div>
                      <div className="text-[0.85rem] text-secondary truncate">
                        <span className="font-medium text-primary">{charge.details?.[0]?.fdNamaCustomer || '-'}</span>
                        {charge.details?.length > 1 && (
                          <span className="ml-1.5 text-[0.68rem] bg-tertiary/10 text-tertiary px-1.5 py-0.5 rounded font-mono font-bold tracking-wide uppercase">
                            +{charge.details.length - 1}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 mt-1 text-[0.72rem] text-secondary/70 font-mono">
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock size={11} className="shrink-0" />
                          {new Date(charge.fdCreatedAt).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        {refs.length > 0 ? (
                          <span className="truncate">{refs[0]}</span>
                        ) : charge.details?.[0]?.fdNoInputan ? (
                          <span className="truncate">No. {charge.details[0].fdNoInputan}</span>
                        ) : null}
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-secondary/40 shrink-0" />
                  </Link>
                );
              })
            )}
          </div>
          </>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              Array.from({ length: limit }).map((_, index) => (
                <div key={index} className="card p-5 space-y-4 animate-pulse">
                  <div className="flex justify-between items-start">
                    <div className="h-6 w-24 skeleton" />
                    <div className="h-6 w-16 skeleton" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-40 skeleton" />
                    <div className="h-4 w-24 skeleton" />
                  </div>
                  <div className="pt-4 mt-2 border-t border-secondary/10">
                    <div className="h-9 w-full skeleton" />
                  </div>
                </div>
              ))
            ) : isError ? (
              <div className="col-span-full py-12 text-center text-sm text-rose-500 font-medium bg-surface rounded-lg border border-rose-500/20">
                {t('lc_err_fetch')}
              </div>
            ) : data?.data.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-surface rounded-lg border border-secondary/20">
                <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                  <div className="w-16 h-16 bg-neutral rounded-full flex items-center justify-center mb-4 border border-secondary/20">
                    <ClipboardList className="w-8 h-8 text-secondary" />
                  </div>
                  <h3 className="text-lg font-semibold text-primary mb-1">{t('lc_empty_title')}</h3>
                  <p className="text-secondary text-sm leading-relaxed mb-4">
                    {t('lc_empty_desc')}
                  </p>
                  {hasPermission(currentUser, 'local_charges:create') && (
                    <Link to="/new" className="btn-secondary py-2 px-4 text-sm flex items-center gap-1.5">
                      <Plus size={16} /> {t('lc_create_btn')}
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              data?.data.map((charge) => {
                const statusInfo = statusMap[charge.fdStatus] || { label: 'Unknown', className: 'badge bg-secondary/15 text-secondary border-secondary/25' };
                return (
                  <div key={charge.fdId} className="card p-5 flex flex-col gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-lg font-bold font-mono text-primary tracking-tight">{charge.fdNomorForm}</span>
                      <span className={statusInfo.className}>{statusInfo.key ? (t as any)(statusInfo.key) : statusInfo.label}</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-[0.7rem] uppercase tracking-wider text-secondary/70 font-semibold mb-0.5">Customer</div>
                        <div className="text-[0.95rem] text-secondary">
                          <span className="font-medium text-primary">{charge.details?.[0]?.fdNamaCustomer || '-'}</span>
                          {charge.details?.length > 1 && (
                            <span className="ml-2 text-[0.72rem] bg-tertiary/10 text-tertiary px-1.5 py-0.5 rounded font-mono font-bold tracking-wide uppercase">
                              +{charge.details.length - 1} More
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-start">
                        <div className="flex-1 min-w-0">
                          <div className="text-[0.7rem] uppercase tracking-wider text-secondary/70 font-semibold mb-0.5">Inputan</div>
                          <div className="text-sm font-mono text-secondary truncate">{charge.details?.[0]?.fdNoInputan || '-'}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[0.7rem] uppercase tracking-wider text-secondary/70 font-semibold mb-0.5">References</div>
                          <div className="flex flex-col gap-0.5 font-mono text-[0.75rem] text-secondary">
                            {charge.details?.[0]?.fdMarking && <span><span className="text-secondary/50">MKR:</span> <span className="font-semibold text-primary">{charge.details[0].fdMarking}</span></span>}
                            {charge.details?.[0]?.fdNoReceipt && <span><span className="text-secondary/50">RCT:</span> <span className="font-semibold text-primary">{charge.details[0].fdNoReceipt}</span></span>}
                            {charge.details?.[0]?.fdNoBilling && <span><span className="text-secondary/50">BIL:</span> <span className="font-semibold text-primary">{charge.details[0].fdNoBilling}</span></span>}
                            {(!charge.details?.[0]?.fdMarking && !charge.details?.[0]?.fdNoReceipt && !charge.details?.[0]?.fdNoBilling) && <span>ΓÇö</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-secondary/10">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 px-1 text-[0.7rem] font-medium text-secondary/80">
                        <div className="flex items-center gap-1.5 min-w-0" title="Author">
                          <User size={12} className="shrink-0" />
                          <span className="truncate">{charge.user?.fdNama || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0" title="Date Created">
                          <Clock size={12} className="shrink-0" />
                          <span>{new Date(charge.fdCreatedAt).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {charge.fdStatus !== 2 && hasPermission(currentUser, 'local_charges:pull_invoice') && (
                          <button
                            type="button"
                            onClick={() => setPullInvoiceTarget({ id: charge.fdId, nomorForm: charge.fdNomorForm })}
                            className="btn-secondary flex-none px-3 py-2 text-sm flex items-center gap-1.5"
                            title="Pull Invoice"
                          >
                            <FileSearchIcon size={15} />
                          </button>
                        )}
                        <Link
                          to={`/form/${charge.fdId}`}
                          className="btn-secondary flex-1 justify-center text-sm py-2"
                        >
                          <Eye size={16} className="mr-1.5" />
                          {t('lc_view_details')}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Pagination Section */}
        {data?.meta && data.meta.total > 0 && (
          <div className={`px-4 sm:px-6 py-4 ${viewMode === 'table' ? 'bg-surface border-t border-secondary/20' : 'bg-transparent'}`}>
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

      {/* Pull Invoice Dialog — triggered from row actions */}
      {pullInvoiceTarget && (
        <PullInvoiceDialog
          isOpen={true}
          localChargesId={pullInvoiceTarget.id}
          fdNomorForm={pullInvoiceTarget.nomorForm}
          onClose={() => setPullInvoiceTarget(null)}
          onStatusUpdated={() => {
            setPullInvoiceTarget(null);
          }}
        />
      )}
    </div>
  );
}

