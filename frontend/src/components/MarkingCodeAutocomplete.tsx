import { useState, useCallback, useEffect } from 'react';
import { Search, Plus, X, Loader2, ChevronDown } from 'lucide-react';
import { useAutocomplete } from '../hooks/useAutocomplete';
import { useTranslation } from '../hooks/useTranslation';

export interface EntryListData {
  fdListCode: string;
  fdMarkingCode: string;
  fdMarkingNo: string;
  fdCustName: string | null;
  fdTerima?: string | null;
}

interface MarkingCodeAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (data: EntryListData) => void;
  required?: boolean;
}

const SUPPORTED_VARIABLES = [
  { value: 'custSearch', tKey: 'ac_var_custSearch' },
  { value: 'markingNo', tKey: 'ac_var_markingNo' },
  { value: 'terima', tKey: 'ac_var_terima' }
] as const;

export default function MarkingCodeAutocomplete({ value, onChange, onSelect, required }: MarkingCodeAutocompleteProps) {
  const { t } = useTranslation();

  const [variables, setVariables] = useState([{ key: 'custSearch', value: '' }]);
  const [extraParams, setExtraParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const params: Record<string, string> = {};
    variables.forEach(v => {
      if (v.key && v.key.trim() !== '') {
        // We do not skip if v.value is empty here, because the user might have cleared it.
        // useAutocomplete will skip appending empty values to the URL.
        params[v.key.trim()] = v.value;
      }
    });
    setExtraParams(params);
  }, [variables]);

  const {
    isOpen,
    setIsOpen,
    search,
    setSearch,
    options,
    isLoading,
    isLoadingMore,
    hasMore,
    wrapperRef,
    loadMore
  } = useAutocomplete<EntryListData>({
    endpoint: '/inspection-reports/lookup',
    value,
    onChange,
    isPaginated: true,
    extraParams,
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 80;
    if (bottom && hasMore && !isLoadingMore && !isLoading) {
      loadMore();
    }
  };

  const handleChange = useCallback((raw: string) => {
    const upperVal = raw.toUpperCase();
    setSearch(upperVal);
    onChange(upperVal);
    if (!isOpen) setIsOpen(true);
  }, [onChange, setSearch, setIsOpen, isOpen]);

  const handleSelectLocal = (data: EntryListData) => {
    const displayValue = data.fdMarkingCode;
    setSearch(displayValue);
    onChange(displayValue);
    onSelect(data);
    setIsOpen(false);
  };

  function addVariable() {
    // Find the first available key that isn't used yet
    const usedKeys = variables.map(v => v.key);
    const availableKey = SUPPORTED_VARIABLES.find(opt => !usedKeys.includes(opt.value))?.value || 'custSearch';
    setVariables((prev) => [...prev, { key: availableKey, value: '' }]);
  }

  function removeVariable(index: number) {
    setVariables((prev) => prev.filter((_, i) => i !== index));
  }

  function updateVariable(index: number, field: 'key' | 'value', val: string) {
    setVariables((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: val } : v))
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* ---------- Input utama ---------- */}
      <div
        className={`relative flex items-center rounded-md border bg-surface transition-colors ${isOpen
            ? "border-tertiary/60 ring-1 ring-tertiary/50"
            : "border-secondary/30 hover:border-secondary/50"
          }`}
      >
        <Search className="absolute left-3.5 h-4 w-4 text-secondary/70" />
        <input
          required={required}
          value={search}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={t('mc_search_placeholder') || "Cari data..."}
          className="w-full bg-transparent py-2 pl-10 pr-10 text-[0.95rem] text-primary placeholder:text-secondary/60 focus:outline-none rounded-md"
          autoComplete="off"
        />
        <ChevronDown
          className={`absolute right-3.5 h-4 w-4 text-secondary/70 transition-transform ${isOpen ? "rotate-180 text-tertiary" : ""
            }`}
        />
      </div>

      {/* ---------- Dropdown panel ---------- */}
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-secondary/20 bg-surface shadow-lg max-h-[28rem] flex flex-col">
          {/* --- Section: Variabel tambahan --- */}
          <div className="border-b border-secondary/20 p-3 shrink-0">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[0.7rem] font-medium uppercase tracking-wide text-secondary">
                {t('ac_var_label') || 'Variabel tambahan'}
              </span>
              {variables.length < SUPPORTED_VARIABLES.length && (
                <button
                  type="button"
                  onClick={addVariable}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-tertiary hover:bg-tertiary/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('ac_var_add') || 'Tambah'}
                </button>
              )}
            </div>

            <div className="space-y-2">
              {variables.map((v, i) => {
                const usedKeys = variables.map(varItem => varItem.key);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={v.key}
                      onChange={(e) => updateVariable(i, "key", e.target.value)}
                      className="w-2/5 rounded-md border border-secondary/30 bg-surface px-2 py-1.5 text-xs text-primary focus:border-tertiary focus:outline-none"
                    >
                      {SUPPORTED_VARIABLES.map(opt => (
                        <option
                          key={opt.value}
                          value={opt.value}
                          disabled={usedKeys.includes(opt.value) && opt.value !== v.key}
                        >
                          {t(opt.tKey) || opt.tKey}
                        </option>
                      ))}
                    </select>
                    <input
                      value={v.value}
                      onChange={(e) => updateVariable(i, "value", e.target.value)}
                      placeholder={t('ac_var_value') || "nilai"}
                      className="flex-1 rounded-md border border-secondary/30 bg-surface px-2 py-1.5 text-xs text-primary placeholder:text-secondary/50 focus:border-tertiary focus:outline-none"
                    />
                    {variables.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariable(i)}
                        className="rounded p-1.5 text-secondary hover:bg-neutral hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- Section: Hasil query (infinite scroll) --- */}
          <div
            onScroll={handleScroll}
            className="overflow-y-auto flex-1 min-h-[10rem]"
          >
            {options.length === 0 && !isLoading ? (
              <div className="px-4 py-8 text-center text-[0.95rem] text-secondary">
                {t('mc_no_results') || 'Tidak ada hasil ditemukan.'}
              </div>
            ) : (
              <div className="flex flex-col py-1">
                {options.map((opt, idx) => {
                  const title = opt.fdCustName || t('mc_unknown_cust') || 'Unknown Customer';
                  const parts = [
                    opt.fdMarkingCode ? `Kode: ${opt.fdMarkingCode}` : '',
                    opt.fdMarkingNo ? `No: ${opt.fdMarkingNo}` : '',
                    opt.fdTerima && opt.fdTerima.trim() !== '' ? `Terima: ${opt.fdTerima.trim()}` : '',
                    opt.fdListCode ? `List: ${opt.fdListCode}` : ''
                  ].filter(Boolean).join(' · ');

                  return (
                    <button
                      key={`${opt.fdListCode}-${idx}`}
                      type="button"
                      onClick={() => handleSelectLocal(opt)}
                      className="flex w-full items-start gap-2.5 border-b border-secondary/10 px-3 py-2 text-left hover:bg-neutral last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.95rem] font-medium text-[#C26B5B]">{title}</p>
                        <p className="truncate text-[0.72rem] text-secondary mt-0.5">{parts || 'Tidak ada info tambahan'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {(isLoading || isLoadingMore) && (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-secondary border-t border-secondary/10">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-tertiary" />
                {isLoadingMore ? (t('mc_loading_more') || 'Memuat lebih banyak...') : (t('state_loading') || 'Memuat hasil...')}
              </div>
            )}
          </div>

          {/* --- Footer: ringkasan jumlah hasil --- */}
          {options.length > 0 && (
            <div className="flex items-center justify-between border-t border-secondary/20 bg-surface px-3 py-2 text-xs text-secondary shrink-0">
              <span>
                {t('mc_showing_rows', { count: options.length }) || `Menampilkan ${options.length} hasil`}
              </span>
              {hasMore && !isLoading && !isLoadingMore ? (
                <span className="text-tertiary">{t('mc_scroll_more') || 'scroll untuk muat lebih banyak'}</span>
              ) : !hasMore && !isLoading && !isLoadingMore ? (
                <span className="text-secondary/70">{t('mc_all_loaded') || 'Semua hasil dimuat'}</span>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
