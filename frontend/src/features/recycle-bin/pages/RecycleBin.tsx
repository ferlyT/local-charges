import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { Trash2, RefreshCw, FileX, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '../../../hooks/useTranslation';
import ConfirmModal from '../../../components/ConfirmModal';

interface TrashItem {
  fdId: number;
  fdNomorForm?: string;
  fdReportNumber?: string;
  fdDeletedAt: string;
  user?: { fdNama: string };
  details?: { fdNamaCustomer: string; fdNoInputan: string }[];
  fdNamaCustomer?: string;
}

type TabType = 'local-charges' | 'inspection-reports';

export default function RecycleBin() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const queryClient = useQueryClient();
  const { t, language } = useTranslation();

  const [activeTab, setActiveTab] = useState<TabType>('local-charges');
  
  const [restoreId, setRestoreId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['trash', activeTab, page, limit],
    queryFn: async () => {
      const endpoint = activeTab === 'local-charges' ? '/local-charges/trash' : '/inspection-reports/trash';
      const res = await api.get(endpoint, {
        params: { page, limit }
      });
      return res.data;
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      const endpoint = activeTab === 'local-charges' ? `/local-charges/${id}/restore` : `/inspection-reports/${id}/restore`;
      await api.patch(endpoint);
    },
    onSuccess: () => {
      toast.success(t('rb_toast_restore_success'));
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['localCharges'] });
      queryClient.invalidateQueries({ queryKey: ['inspectionReports'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t('rb_toast_restore_err'));
    }
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const endpoint = activeTab === 'local-charges' ? `/local-charges/${id}/permanent` : `/inspection-reports/${id}/permanent`;
      await api.delete(endpoint);
    },
    onSuccess: () => {
      toast.success(t('rb_toast_del_success'));
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t('rb_toast_del_err'));
    }
  });

  const handleRestore = (id: number) => {
    setRestoreId(id);
  };

  const confirmRestore = () => {
    if (restoreId !== null) {
      restoreMutation.mutate(restoreId);
      setRestoreId(null);
    }
  };

  const handlePermanentDelete = (id: number) => {
    setDeleteId(id);
  };

  const confirmPermanentDelete = () => {
    if (deleteId !== null) {
      permanentDeleteMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };

  // Reset page when switching tabs
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2 border-b border-secondary/10">
        <div>
          <h1 className="text-[2.2rem] font-display text-primary tracking-[-0.02em] leading-none mb-2 flex items-center gap-3">
            <Trash2 className="text-rose-500" size={32} />
            {t('rb_title')}
          </h1>
          <p className="text-[0.95rem] text-secondary">
            {t('rb_subtitle')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-secondary/20 pb-0 mb-4">
        <button
          onClick={() => handleTabChange('local-charges')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'local-charges' 
              ? 'border-tertiary text-tertiary' 
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          {t('rb_tab_lc')}
        </button>
        <button
          onClick={() => handleTabChange('inspection-reports')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'inspection-reports' 
              ? 'border-tertiary text-tertiary' 
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          {t('rb_tab_ir')}
        </button>
      </div>

      <div className="bg-surface shadow-md border border-secondary/20 rounded-lg overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary/20">
            <thead className="bg-neutral/50">
              <tr>
                <th className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">{t('col_form_no')}</th>
                <th className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">{t('col_customer')}</th>
                <th className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">{t('col_deleted_date')}</th>
                <th className="px-6 py-4 text-right text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">{t('col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary/15">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-secondary">{t('state_loading')}</td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-rose-500 font-medium">
                    {t('rb_err_fetch')}
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FileX className="w-12 h-12 text-secondary/50 mb-3" />
                      <h3 className="text-lg font-semibold text-primary mb-1">{t('rb_empty_title')}</h3>
                      <p className="text-secondary text-sm">{t('rb_empty_desc')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data.map((item: TrashItem) => (
                  <tr key={item.fdId} className="hover:bg-neutral/40 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-[0.95rem] font-semibold text-primary">
                      {item.fdNomorForm || item.fdReportNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[0.95rem] text-secondary">
                      <span className="font-medium text-primary">
                        {item.details?.[0]?.fdNamaCustomer || item.fdNamaCustomer || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[0.9rem] text-secondary">
                      {new Date(item.fdDeletedAt).toLocaleString(language === 'id' ? 'id-ID' : 'en-US')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestore(item.fdId)}
                          disabled={restoreMutation.isPending || permanentDeleteMutation.isPending}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-500/10 rounded-md transition-colors flex items-center gap-1.5 text-sm font-medium"
                        >
                          <RefreshCw size={16} /> {t('rb_restore_btn')}
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(item.fdId)}
                          disabled={restoreMutation.isPending || permanentDeleteMutation.isPending}
                          className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors flex items-center gap-1.5 text-sm font-medium"
                        >
                          <Trash2 size={16} /> {t('rb_delete_btn')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile short-list — compact stacked rows, no horizontal scroll */}
        <div className="md:hidden divide-y divide-secondary/15">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-secondary text-sm">{t('state_loading')}</div>
          ) : isError ? (
            <div className="px-6 py-12 text-center text-rose-500 font-medium text-sm">
              {t('rb_err_fetch')}
            </div>
          ) : data?.data.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="flex flex-col items-center justify-center">
                <FileX className="w-12 h-12 text-secondary/50 mb-3" />
                <h3 className="text-lg font-semibold text-primary mb-1">{t('rb_empty_title')}</h3>
                <p className="text-secondary text-sm">{t('rb_empty_desc')}</p>
              </div>
            </div>
          ) : (
            data?.data.map((item: TrashItem) => (
              <div key={item.fdId} className="px-4 py-4 space-y-3">
                <div className="min-w-0">
                  <div className="font-semibold text-primary truncate">
                    {item.fdNomorForm || item.fdReportNumber}
                  </div>
                  <div className="text-[0.85rem] text-secondary truncate">
                    {item.details?.[0]?.fdNamaCustomer || item.fdNamaCustomer || '-'}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[0.75rem] text-secondary/70">
                    <Clock size={11} className="shrink-0" />
                    {new Date(item.fdDeletedAt).toLocaleString(language === 'id' ? 'id-ID' : 'en-US')}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleRestore(item.fdId)}
                    disabled={restoreMutation.isPending || permanentDeleteMutation.isPending}
                    className="flex-1 py-2 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-md transition-colors flex items-center justify-center gap-1.5 text-sm font-medium disabled:opacity-30"
                  >
                    <RefreshCw size={16} /> {t('rb_restore_btn')}
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(item.fdId)}
                    disabled={restoreMutation.isPending || permanentDeleteMutation.isPending}
                    className="flex-1 py-2 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 rounded-md transition-colors flex items-center justify-center gap-1.5 text-sm font-medium disabled:opacity-30"
                  >
                    <Trash2 size={16} /> {t('rb_delete_btn')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {data?.meta && data.meta.total > 0 && (
          <div className="px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-secondary/20">
            <p className="text-[0.82rem] sm:text-[0.9rem] text-secondary text-center sm:text-left order-2 sm:order-1">
              {t('pagination_showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, data.meta.total), total: data.meta.total })}
            </p>
            <div className="flex items-center justify-between gap-2 order-1 sm:order-2 sm:justify-start">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
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
                onClick={() => setPage(p => Math.min(data.meta.totalPages, p + 1))}
                disabled={page >= data.meta.totalPages}
                aria-label={t('pagination_next')}
                className="btn-secondary p-2.5 sm:px-3.5 sm:py-2 text-sm disabled:opacity-30 shrink-0 flex items-center justify-center"
              >
                <ChevronRight size={16} className="sm:hidden" />
                <span className="hidden sm:inline">{t('pagination_next')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Confirm Modals */}
      <ConfirmModal
        isOpen={restoreId !== null}
        title={t('rb_confirm_restore')}
        message={t('rb_confirm_restore')}
        confirmText="Restore"
        cancelText={t('btn_cancel') || 'Cancel'}
        onConfirm={confirmRestore}
        onCancel={() => setRestoreId(null)}
        isDestructive={false}
      />

      <ConfirmModal
        isOpen={deleteId !== null}
        title={t('rb_delete_btn')}
        message={t('rb_confirm_del')}
        confirmText={t('rb_delete_btn')}
        cancelText={t('btn_cancel') || 'Cancel'}
        onConfirm={confirmPermanentDelete}
        onCancel={() => setDeleteId(null)}
        isDestructive={true}
      />
    </div>
  );
}
