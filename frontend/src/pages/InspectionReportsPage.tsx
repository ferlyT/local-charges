import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInspectionReports } from '../hooks/useInspectionReports';
import { Search, Eye, Plus, ArrowRight, ClipboardList, LayoutList, ChevronUp, ChevronDown, ChevronsUpDown, User, Clock } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { useAuthStore } from '../stores/authStore';
import { hasPermission } from '../lib/permissions';

const statusMap: Record<string, { label: string; className: string }> = {
  '1': { label: 'Draft', className: 'badge-draft' },
  '2': { label: 'Done', className: 'badge-done' },
};

function SortIcon({ field, sortBy, sortOrder }: { field: string; sortBy: string; sortOrder: string }) {
  if (sortBy !== field) return <ChevronsUpDown size={14} className="text-secondary/40 group-hover:text-secondary/70" />;
  return sortOrder === 'asc'
    ? <ChevronUp size={14} className="text-tertiary" />
    : <ChevronDown size={14} className="text-tertiary" />;
}

export default function InspectionReportsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('fdCreatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState(20);

  const currentUser = useAuthStore(state => state.user);
  
  const debouncedSearch = useDebounce(search, 500);
  const { data, isLoading, isError } = useInspectionReports(page, limit, debouncedSearch, sortBy, sortOrder);

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2 border-b border-secondary/10">
        <div>
          <h1 className="text-[2.6rem] font-display text-primary tracking-[-0.02em] leading-none mb-2">
            Inspection Reports
          </h1>
          <p className="text-[0.95rem] text-secondary">
            Manage, filter, and track inspection reports and details.
          </p>
        </div>
        {hasPermission(currentUser, 'local_charges:create') && (
          <Link
            to="/inspection-reports/new"
            className="btn-primary inline-flex items-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus size={18} />
            New Report
          </Link>
        )}
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-4 items-center justify-between sticky top-4 z-20 shadow-lg border-secondary/20 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="relative w-full flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
            <Search size={18} />
          </div>
          <input
            type="text"
            className="form-input pl-10 w-full"
            placeholder="Search by report number, customer, marking code, marking no..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2 border border-secondary/20 rounded-lg p-1 shrink-0 self-end sm:self-auto">
          <div className="flex items-center pl-2 pr-2 border-r border-secondary/20">
            <span className="text-[0.75rem] text-secondary font-medium mr-2 hidden sm:inline">Per page:</span>
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary/20">
            <thead className="bg-neutral/50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase cursor-pointer select-none group hover:bg-secondary/5 transition-colors"
                  onClick={() => handleSort('fdReportNumber')}
                >
                  <span className="flex items-center gap-1.5">
                    No. Report
                    <SortIcon field="fdReportNumber" sortBy={sortBy} sortOrder={sortOrder} />
                  </span>
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase cursor-pointer select-none group hover:bg-secondary/5 transition-colors"
                  onClick={() => handleSort('fdReportDate')}
                >
                  <span className="flex items-center gap-1.5">
                    Report Date
                    <SortIcon field="fdReportDate" sortBy={sortBy} sortOrder={sortOrder} />
                  </span>
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase cursor-pointer select-none group hover:bg-secondary/5 transition-colors"
                  onClick={() => handleSort('fdNamaCustomer')}
                >
                  <span className="flex items-center gap-1.5">
                    Customer
                    <SortIcon field="fdNamaCustomer" sortBy={sortBy} sortOrder={sortOrder} />
                  </span>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">
                  Marking Info
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase cursor-pointer select-none group hover:bg-secondary/5 transition-colors"
                  onClick={() => handleSort('fdStatus')}
                >
                  <span className="flex items-center gap-1.5">
                    Status
                    <SortIcon field="fdStatus" sortBy={sortBy} sortOrder={sortOrder} />
                  </span>
                </th>
                <th scope="col" className="px-6 py-4 text-right text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">Actions</th>
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
                    Failed to fetch inspection reports. Please try again.
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="w-16 h-16 bg-neutral rounded-full flex items-center justify-center mb-4 border border-secondary/20">
                        <ClipboardList className="w-8 h-8 text-secondary" />
                      </div>
                      <h3 className="text-lg font-semibold text-primary mb-1">No reports found</h3>
                      <p className="text-secondary text-sm leading-relaxed mb-4">
                        We couldn't find any inspection reports matching your search parameters. Try adjusting your query or create a new report.
                      </p>
                      {hasPermission(currentUser, 'local_charges:create') && (
                        <Link to="/inspection-reports/new" className="btn-secondary py-2 px-4 text-sm flex items-center gap-1.5">
                          <Plus size={16} /> Create Report
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
                        {new Date(report.fdReportDate).toLocaleDateString('id-ID', {
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
                          {statusInfo.label}
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
                            <span className="hidden sm:inline">Details</span>
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

        {/* Pagination Section */}
        {data?.meta && data.meta.total > 0 && (
          <div className="px-6 py-4 flex items-center justify-between bg-surface border-t border-secondary/20">
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-[0.9rem] text-secondary">
                  Showing <span className="font-semibold text-primary">{(page - 1) * limit + 1}</span> to <span className="font-semibold text-primary">{Math.min(page * limit, data.meta.total)}</span> of <span className="font-semibold text-primary">{data.meta.total}</span> records
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary px-3.5 py-2 text-sm disabled:opacity-30"
                >
                  Previous
                </button>
                <div className="font-mono text-sm px-3 text-secondary">
                  Page <span className="font-semibold text-primary">{page}</span> of <span className="font-semibold text-primary">{data.meta.totalPages}</span>
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                  disabled={page >= data.meta.totalPages}
                  className="btn-secondary px-3.5 py-2 text-sm disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
