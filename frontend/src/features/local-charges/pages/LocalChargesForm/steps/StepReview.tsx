import React from 'react';
import { CheckCircle2, User, Paperclip, List, ArrowLeft } from 'lucide-react';
import type { Detail } from './StepItems';
import type { Lampiran } from '../../../../../components/lampiran/LampiranGrid';

interface FormState {
  fdDirequest?: string;
  fdBilling?: string;
  fdAR?: string;
}

interface StepReviewProps {
  form: FormState;
  details: Detail[];
  lampiranItems: Lampiran[];
  onGoToStep: (step: number) => void;
}

export default function StepReview({ form, details, lampiranItems, onGoToStep }: StepReviewProps) {
  const validDetails = details.filter((d) => d.fdNamaCustomer.trim() !== '');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[1.1rem] font-semibold text-primary">Review &amp; Confirm</h2>
        <p className="text-secondary text-xs mt-0.5">
          Cek kembali semua data sebelum menyimpan. Klik "Kembali edit" untuk merevisi.
        </p>
      </div>

      {/* Officers Summary */}
      <div className="card p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <User size={16} className="text-tertiary" />
            <h3 className="text-[0.9rem] font-semibold text-primary">Officers / PIC</h3>
          </div>
          <button
            type="button"
            onClick={() => onGoToStep(0)}
            className="flex items-center gap-1 text-[0.78rem] text-tertiary hover:underline"
          >
            <ArrowLeft size={13} /> Kembali edit
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1">
          {[
            { label: 'Di-request', value: form.fdDirequest },
            { label: 'Billing', value: form.fdBilling },
            { label: 'AR (Finance)', value: form.fdAR },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[0.68rem] uppercase tracking-wide font-semibold text-secondary mb-0.5">{label}</p>
              <p className={`text-[0.88rem] font-medium ${value ? 'text-primary' : 'text-secondary/40 italic'}`}>
                {value || 'Tidak diisi'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Items Summary */}
      <div className="card p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <List size={16} className="text-tertiary" />
            <h3 className="text-[0.9rem] font-semibold text-primary flex items-center flex-wrap gap-2">
              Items &amp; References
              <span className="text-[0.78rem] font-mono bg-tertiary/10 text-tertiary px-1.5 py-0.5 rounded">
                {validDetails.length} baris
              </span>
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onGoToStep(1)}
            className="flex items-center gap-1 text-[0.78rem] text-tertiary hover:underline"
          >
            <ArrowLeft size={13} /> Kembali edit
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[0.8rem]">
            <thead>
              <tr className="border-b border-secondary/15">
                <th className="text-left py-2 pr-4 text-secondary font-semibold uppercase text-[0.68rem] tracking-wide">#</th>
                <th className="text-left py-2 pr-4 text-secondary font-semibold uppercase text-[0.68rem] tracking-wide">No. Inputan</th>
                <th className="text-left py-2 pr-4 text-secondary font-semibold uppercase text-[0.68rem] tracking-wide">Customer</th>
                <th className="text-left py-2 pr-4 text-secondary font-semibold uppercase text-[0.68rem] tracking-wide">Marking</th>
                <th className="text-left py-2 pr-4 text-secondary font-semibold uppercase text-[0.68rem] tracking-wide">Receipt</th>
                <th className="text-right py-2 text-secondary font-semibold uppercase text-[0.68rem] tracking-wide">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary/10">
              {validDetails.map((d, i) => (
                <tr key={i} className="hover:bg-neutral/30">
                  <td className="py-2 pr-4 text-secondary/60 font-mono">{i + 1}</td>
                  <td className="py-2 pr-4 font-mono font-semibold text-tertiary">{d.fdNoInputan || '—'}</td>
                  <td className="py-2 pr-4 text-primary font-medium">{d.fdNamaCustomer || '—'}</td>
                  <td className="py-2 pr-4 font-mono text-secondary">{d.fdMarking || '—'}</td>
                  <td className="py-2 pr-4 font-mono text-secondary">{d.fdNoReceipt || '—'}</td>
                  <td className="py-2 text-right font-mono text-primary font-semibold">
                    {d.fdJumlah
                      ? `${d.fdMataUang || 'IDR'} ${Number(d.fdJumlah).toLocaleString('id-ID')}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attachments Summary */}
      <div className="card p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Paperclip size={16} className="text-tertiary" />
            <h3 className="text-[0.9rem] font-semibold text-primary flex items-center flex-wrap gap-2">
              Lampiran
              <span className="text-[0.78rem] font-mono bg-tertiary/10 text-tertiary px-1.5 py-0.5 rounded">
                {lampiranItems.length} file
              </span>
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onGoToStep(2)}
            className="flex items-center gap-1 text-[0.78rem] text-tertiary hover:underline"
          >
            <ArrowLeft size={13} /> Tambah lampiran
          </button>
        </div>
        {lampiranItems.length === 0 ? (
          <p className="text-[0.82rem] text-secondary/60 italic">Tidak ada lampiran yang di-upload.</p>
        ) : (
          <ul className="space-y-1">
            {lampiranItems.map((l) => (
              <li key={l.fdId} className="flex items-center gap-2 text-[0.82rem] text-secondary">
                <Paperclip size={12} className="text-secondary/50 shrink-0" />
                <span className="truncate">{l.fdFileName}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Confirmation notice */}
      <div className="flex items-start gap-3 px-3 sm:px-4 py-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
        <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
        <p className="text-[0.85rem] text-emerald-700">
          Data sudah tersimpan. Klik <strong>Selesai</strong> untuk kembali ke daftar Local Charges.
        </p>
      </div>
    </div>
  );
}
