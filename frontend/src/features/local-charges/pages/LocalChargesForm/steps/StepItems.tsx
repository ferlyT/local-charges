import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import CustomerAutocomplete from '../../../../../components/CustomerAutocomplete';
import InputanAutocomplete from '../../../../../components/InputanAutocomplete';

export interface Detail {
  fdNamaCustomer: string;
  fdMarking: string;
  fdNoReceipt: string;
  fdNoBilling: string;
  fdNoInputan: string;
  fdKeterangan: string;
  fdMataUang: string;
  fdJumlah: string;
}

const CURRENCY_OPTIONS = ['IDR', 'USD', 'SGD', 'CNY', 'HKD'];

interface StepItemsProps {
  details: Detail[];
  onUpdate: (index: number, field: keyof Detail, value: string) => void;
  onUpdateMultiple: (index: number, data: Partial<Detail>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  canSave: boolean;
  inputanErrors: boolean[];
}

function isRowComplete(d: Detail) {
  return d.fdNamaCustomer.trim() !== '' && !!d.fdNoInputan?.trim();
}

export default function StepItems({
  details,
  onUpdate,
  onUpdateMultiple,
  onAdd,
  onRemove,
  canSave,
  inputanErrors,
}: StepItemsProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(
    () => new Set(details.map((_, i) => i)) // Start with all expanded
  );

  const toggleRow = (index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const completeCount = details.filter(isRowComplete).length;
  const totalCount = details.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div>
          <h2 className="text-[1.1rem] font-semibold text-primary">Items &amp; References</h2>
          <p className="text-secondary text-xs mt-0.5">Specify customer and relevant tracking identifiers.</p>
        </div>
        <div className="flex items-center justify-between sm:justify-start gap-3">
          {/* Progress counter */}
          <span className={`text-[0.72rem] sm:text-[0.78rem] font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${completeCount === totalCount && totalCount > 0
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-700 border-amber-500/20'
            }`}>
            {completeCount} dari {totalCount} baris lengkap
          </span>
          {canSave && (
            <button
              type="button"
              onClick={() => {
                onAdd();
                // Auto-expand new row
                setExpandedRows(prev => new Set([...prev, details.length]));
              }}
              className="btn bg-tertiary/10 hover:bg-tertiary/20 text-tertiary text-sm py-2 px-3 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus size={16} /> Add Row
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {details.map((detail, index) => {
          const complete = isRowComplete(detail);
          const isExpanded = expandedRows.has(index) || !complete || inputanErrors[index];
          const hasError = inputanErrors[index];

          return (
            <div
              key={index}
              className={`border rounded-lg transition-all duration-200 ${hasError
                  ? 'border-rose-400/50 bg-rose-500/5'
                  : complete && !isExpanded
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'border-secondary/20 bg-neutral/30 hover:bg-neutral/50'
                }`}
            >
              {/* Row header — always visible */}
              <div
                className={`flex items-center justify-between px-3 sm:px-4 py-3 gap-2 ${complete ? 'cursor-pointer' : ''}`}
                onClick={() => complete && toggleRow(index)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded text-xs font-mono font-bold shrink-0 ${hasError
                        ? 'bg-rose-500 text-white'
                        : complete
                          ? 'bg-emerald-500 text-white'
                          : 'bg-tertiary text-on-primary'
                      }`}
                  >
                    #{index + 1}
                  </span>
                  {complete && !isExpanded ? (
                    <span className="text-[0.88rem] font-medium text-primary truncate">
                      <span className="font-mono text-tertiary">{detail.fdNoInputan}</span>
                      {detail.fdNamaCustomer && (
                        <span className="text-secondary ml-2">— {detail.fdNamaCustomer}</span>
                      )}
                      {detail.fdMarking && (
                        <span className="text-secondary/60 ml-2 font-mono text-[0.78rem]">{detail.fdMarking}</span>
                      )}
                      {detail.fdJumlah && (
                        <span className="text-emerald-600 ml-2 font-mono text-[0.78rem] font-semibold">
                          {detail.fdMataUang || 'IDR'} {Number(detail.fdJumlah).toLocaleString('id-ID')}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[0.92rem] font-semibold text-primary">Item Details</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canSave && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                      disabled={details.length === 1}
                      className="p-1.5 text-secondary hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Remove Item"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  {complete && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleRow(index); }}
                      className="p-1.5 text-secondary/50 hover:text-secondary rounded-md transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable content */}
              {isExpanded && (
                <div className="px-3 sm:px-4 pb-4 pt-1 border-t border-secondary/10 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* No. Inputan */}
                    <div className="md:col-span-2">
                      <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">
                        No. Inputan <span className="text-rose-500">*</span>
                        <span className="text-secondary/60 normal-case tracking-normal font-normal ml-1">(wajib diisi)</span>
                      </label>
                      <InputanAutocomplete
                        value={detail.fdNoInputan || ''}
                        onChange={(val) => onUpdate(index, 'fdNoInputan', val)}
                        onSelect={(data) => {
                          onUpdateMultiple(index, {
                            fdNoInputan: data.fdNoInputan,
                            fdNamaCustomer: data.fdCustName,
                            fdMarking: data.fdMarking,
                            fdNoReceipt: data.fdNoReceipt,
                            fdNoBilling: data.fdNoBilling,
                          });
                        }}
                        required
                        disabled={!canSave}
                      />
                      {inputanErrors[index] && (
                        <p className="mt-1 text-[0.75rem] text-rose-500 font-medium">No. Inputan wajib diisi.</p>
                      )}
                    </div>

                    {/* Customer Name */}
                    <div className="md:col-span-2">
                      <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">
                        Customer Name <span className="text-rose-500">*</span>
                      </label>
                      <CustomerAutocomplete
                        required={index === 0}
                        disabled={!canSave || !!detail.fdNoInputan}
                        value={detail.fdNamaCustomer}
                        onChange={(val) => onUpdate(index, 'fdNamaCustomer', val)}
                      />
                    </div>

                    {/* Marking / Receipt / Billing */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                      <div>
                        <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">Marking</label>
                        <input
                          type="text"
                          disabled={!canSave || !!detail.fdNoInputan}
                          value={detail.fdMarking || ''}
                          onChange={(e) => onUpdate(index, 'fdMarking', e.target.value.toUpperCase())}
                          className={`form-input ${(!canSave || !!detail.fdNoInputan) ? 'bg-neutral/60 text-secondary cursor-not-allowed border-secondary/15' : ''}`}
                          placeholder="MARKING"
                        />
                      </div>
                      <div>
                        <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">No. Receipt</label>
                        <input
                          type="text"
                          disabled={!canSave || !!detail.fdNoInputan}
                          value={detail.fdNoReceipt || ''}
                          onChange={(e) => onUpdate(index, 'fdNoReceipt', e.target.value.toUpperCase())}
                          className={`form-input ${(!canSave || !!detail.fdNoInputan) ? 'bg-neutral/60 text-secondary cursor-not-allowed border-secondary/15' : ''}`}
                          placeholder="RECEIPT"
                        />
                      </div>
                      <div>
                        <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">No. Billing</label>
                        <input
                          type="text"
                          disabled={!canSave || !!detail.fdNoInputan}
                          value={detail.fdNoBilling || ''}
                          onChange={(e) => onUpdate(index, 'fdNoBilling', e.target.value.toUpperCase())}
                          className={`form-input ${(!canSave || !!detail.fdNoInputan) ? 'bg-neutral/60 text-secondary cursor-not-allowed border-secondary/15' : ''}`}
                          placeholder="BILLING"
                        />
                      </div>
                    </div>

                    {/* Mata Uang / Jumlah */}
                    <div className="md:col-span-2 grid grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">Mata Uang</label>
                        <select
                          disabled={!canSave}
                          value={detail.fdMataUang || 'IDR'}
                          onChange={(e) => onUpdate(index, 'fdMataUang', e.target.value)}
                          className={`form-input ${!canSave ? 'bg-neutral/60 text-secondary cursor-not-allowed border-secondary/15' : ''}`}
                        >
                          {CURRENCY_OPTIONS.map((cur) => (
                            <option key={cur} value={cur}>{cur}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">Jumlah</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          disabled={!canSave}
                          value={detail.fdJumlah || ''}
                          onChange={(e) => onUpdate(index, 'fdJumlah', e.target.value)}
                          className={`form-input ${!canSave ? 'bg-neutral/60 text-secondary cursor-not-allowed border-secondary/15' : ''}`}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Keterangan */}
                    <div className="md:col-span-2">
                      <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">Remarks (Keterangan)</label>
                      <textarea
                        rows={2}
                        disabled={!canSave}
                        value={detail.fdKeterangan || ''}
                        onChange={(e) => onUpdate(index, 'fdKeterangan', e.target.value.toUpperCase())}
                        className={`form-input resize-none ${!canSave ? 'bg-neutral/60 text-secondary cursor-not-allowed border-secondary/15' : ''}`}
                        placeholder="Remarks info..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
