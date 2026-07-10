import React, { useState } from 'react';
import { X, FileSearch, CheckCircle, AlertCircle, RefreshCw, TrendingUp } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface InvoiceResult {
  fdListCode: string;
  fdMarkingNo: string;
  fdMarkingCode: string;
  fdCustName: string;
  fdNoReceipt: string;
  fdNoBilling: string;
  fdTerima: string | null;
}

interface PullInvoiceDialogProps {
  isOpen: boolean;
  localChargesId: number;
  fdNomorForm: string;
  onClose: () => void;
  onStatusUpdated: () => void;
}

export default function PullInvoiceDialog({
  isOpen,
  localChargesId,
  fdNomorForm,
  onClose,
  onStatusUpdated,
}: PullInvoiceDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<InvoiceResult[] | null>(null);
  const [statusUpdated, setStatusUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePull = async () => {
    setIsLoading(true);
    setError(null);
    setResults(null);
    setStatusUpdated(false);

    try {
      const res = await api.post(`/local-charges/${localChargesId}/pull-invoice`);
      const data = res.data;
      setResults(data.results);
      setStatusUpdated(data.statusUpdated);

      if (data.statusUpdated) {
        toast.success('Status form berhasil diperbarui ke Done!');
        onStatusUpdated();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menarik data invoice. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setResults(null);
    setError(null);
    setStatusUpdated(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-2xl bg-surface rounded-xl shadow-2xl border border-secondary/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary/15 bg-neutral/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center">
              <FileSearch size={17} className="text-tertiary" />
            </div>
            <div>
              <h2 className="text-[1rem] font-semibold text-primary">Pull Invoice</h2>
              <p className="text-[0.75rem] text-secondary mt-0.5">Form: <span className="font-mono text-tertiary">{fdNomorForm}</span></p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md text-secondary hover:text-primary hover:bg-neutral transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Description */}
          <p className="text-[0.88rem] text-secondary leading-relaxed">
            Sistem akan mencari data invoice dari <span className="font-semibold text-primary">SEJDB2020</span> berdasarkan
            No. Inputan yang terdaftar pada form ini. Jika ditemukan, status form akan otomatis diperbarui menjadi <span className="font-semibold text-primary">Done</span>.
          </p>

          {/* Pull Button */}
          {!results && !error && (
            <button
              onClick={handlePull}
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Menarik data invoice...</span>
                </>
              ) : (
                <>
                  <FileSearch size={16} />
                  <span>Tarik Data Invoice</span>
                </>
              )}
            </button>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[0.88rem] font-medium text-rose-500">Gagal menarik data</p>
                <p className="text-[0.82rem] text-rose-500/80 mt-0.5">{error}</p>
              </div>
              <button
                onClick={handlePull}
                className="ml-auto text-[0.8rem] text-rose-500 hover:text-rose-600 font-medium underline underline-offset-2 shrink-0"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* Results */}
          {results !== null && (
            <div className="space-y-4">
              {/* Status Banner */}
              {results.length > 0 ? (
                <div className={`rounded-lg border p-3.5 flex items-center gap-3 ${statusUpdated ? 'border-emerald-500/25 bg-emerald-500/8' : 'border-secondary/20 bg-neutral/30'}`}>
                  <CheckCircle size={18} className={statusUpdated ? 'text-emerald-500' : 'text-secondary'} />
                  <div>
                    <p className={`text-[0.88rem] font-semibold ${statusUpdated ? 'text-emerald-600' : 'text-primary'}`}>
                      {results.length} invoice ditemukan
                      {statusUpdated && ' — Status diperbarui ke Done'}
                    </p>
                    {!statusUpdated && (
                      <p className="text-[0.78rem] text-secondary mt-0.5">Status sudah Done sebelumnya.</p>
                    )}
                  </div>
                  {statusUpdated && (
                    <div className="ml-auto flex items-center gap-1 text-[0.75rem] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
                      <TrendingUp size={12} />
                      Done
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 flex items-center gap-3">
                  <AlertCircle size={18} className="text-amber-500" />
                  <div>
                    <p className="text-[0.88rem] font-semibold text-amber-600">Tidak ada invoice ditemukan</p>
                    <p className="text-[0.78rem] text-secondary mt-0.5">Tidak ada data invoice yang cocok untuk No. Inputan pada form ini.</p>
                  </div>
                </div>
              )}

              {/* Results Table */}
              {results.length > 0 && (
                <div className="border border-secondary/15 rounded-lg overflow-hidden">
                  <table className="w-full text-[0.83rem]">
                    <thead className="bg-neutral/50">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-[0.7rem] uppercase tracking-wide font-semibold text-secondary">List Code</th>
                        <th className="px-3 py-2.5 text-left text-[0.7rem] uppercase tracking-wide font-semibold text-secondary">Customer</th>
                        <th className="px-3 py-2.5 text-left text-[0.7rem] uppercase tracking-wide font-semibold text-secondary">Marking</th>
                        <th className="px-3 py-2.5 text-left text-[0.7rem] uppercase tracking-wide font-semibold text-secondary">No. Billing</th>
                        <th className="px-3 py-2.5 text-left text-[0.7rem] uppercase tracking-wide font-semibold text-secondary">Terima</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary/10">
                      {results.map((row, i) => (
                        <tr key={i} className="hover:bg-neutral/30 transition-colors">
                          <td className="px-3 py-2.5 font-mono font-semibold text-tertiary whitespace-nowrap">{row.fdListCode?.trim()}</td>
                          <td className="px-3 py-2.5 text-primary font-medium">{row.fdCustName?.trim() || '—'}</td>
                          <td className="px-3 py-2.5 font-mono text-secondary">
                            <span>{row.fdMarkingCode?.trim()}</span>
                            {row.fdMarkingNo?.trim() && <span className="ml-1 text-secondary/60">{row.fdMarkingNo.trim()}</span>}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-secondary whitespace-nowrap">{row.fdNoBilling?.trim() || '—'}</td>
                          <td className="px-3 py-2.5 text-secondary whitespace-nowrap">{row.fdTerima?.trim() || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Re-pull button */}
              <button
                onClick={handlePull}
                disabled={isLoading}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                Tarik Ulang
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary/10 flex justify-end">
          <button onClick={handleClose} className="btn-secondary px-5 py-2 text-sm">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
