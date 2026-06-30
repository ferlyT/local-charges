import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Trash2, RefreshCw, FileX } from 'lucide-react';
import toast from 'react-hot-toast';

interface TrashItem {
  fdId: number;
  fdNomorForm: string;
  fdDeletedAt: string;
  user?: { fdNama: string };
  details: { fdNamaCustomer: string; fdNoInputan: string }[];
}

export default function RecycleBin() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['trash', page, limit],
    queryFn: async () => {
      const res = await api.get('/local-charges/trash', {
        params: { page, limit }
      });
      return res.data;
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/local-charges/${id}/restore`);
    },
    onSuccess: () => {
      toast.success('Form restored successfully');
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['localCharges'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to restore form');
    }
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/local-charges/${id}/permanent`);
    },
    onSuccess: () => {
      toast.success('Form permanently deleted');
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to permanently delete form');
    }
  });

  const handleRestore = (id: number) => {
    if (confirm('Are you sure you want to restore this form? It will appear back in the dashboard.')) {
      restoreMutation.mutate(id);
    }
  };

  const handlePermanentDelete = (id: number) => {
    if (confirm('WARNING: Are you absolutely sure? This will permanently delete the form, all its items, and physical attachment files. This action CANNOT be undone!')) {
      permanentDeleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2 border-b border-secondary/10">
        <div>
          <h1 className="text-[2.2rem] font-display text-primary tracking-[-0.02em] leading-none mb-2 flex items-center gap-3">
            <Trash2 className="text-rose-500" size={32} />
            Recycle Bin
          </h1>
          <p className="text-[0.95rem] text-secondary">
            Manage soft-deleted forms. Restore them to the dashboard or permanently delete them.
          </p>
        </div>
      </div>

      <div className="bg-surface shadow-md border border-secondary/20 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary/20">
            <thead className="bg-neutral/50">
              <tr>
                <th className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">No. Form</th>
                <th className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">Customer</th>
                <th className="px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">Deleted Date</th>
                <th className="px-6 py-4 text-right text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary/15">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-secondary">Loading...</td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-rose-500 font-medium">
                    Failed to fetch recycle bin data.
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FileX className="w-12 h-12 text-secondary/50 mb-3" />
                      <h3 className="text-lg font-semibold text-primary mb-1">Recycle Bin is Empty</h3>
                      <p className="text-secondary text-sm">No deleted forms found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data.map((item: TrashItem) => (
                  <tr key={item.fdId} className="hover:bg-neutral/40 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-[0.95rem] font-semibold text-primary">
                      {item.fdNomorForm}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[0.95rem] text-secondary">
                      <span className="font-medium text-primary">{item.details?.[0]?.fdNamaCustomer || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[0.9rem] text-secondary">
                      {new Date(item.fdDeletedAt).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestore(item.fdId)}
                          disabled={restoreMutation.isPending || permanentDeleteMutation.isPending}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-500/10 rounded-md transition-colors flex items-center gap-1.5 text-sm font-medium"
                        >
                          <RefreshCw size={16} /> Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(item.fdId)}
                          disabled={restoreMutation.isPending || permanentDeleteMutation.isPending}
                          className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors flex items-center gap-1.5 text-sm font-medium"
                        >
                          <Trash2 size={16} /> Hard Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data?.meta && data.meta.total > 0 && (
          <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-secondary/20">
            <div>
              <p className="text-[0.9rem] text-secondary">
                Showing <span className="font-semibold text-primary">{(page - 1) * limit + 1}</span> to <span className="font-semibold text-primary">{Math.min(page * limit, data.meta.total)}</span> of <span className="font-semibold text-primary">{data.meta.total}</span> records
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary px-3.5 py-2 text-sm disabled:opacity-30"
              >
                Previous
              </button>
              <div className="font-mono text-sm px-3 text-secondary">
                Page <span className="font-semibold text-primary">{page}</span> of <span className="font-semibold text-primary">{data.meta.totalPages}</span>
              </div>
              <button
                onClick={() => setPage(p => Math.min(data.meta.totalPages, p + 1))}
                disabled={page >= data.meta.totalPages}
                className="btn-secondary px-3.5 py-2 text-sm disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
