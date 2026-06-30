import { useState, useCallback } from 'react';
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

const DELIMITER = ' ';

function parseInput(raw: string): { markingPart: string; custPart: string; isTwoStage: boolean } {
  const delimIdx = raw.indexOf(DELIMITER);
  if (delimIdx === -1) {
    return { markingPart: '', custPart: '', isTwoStage: false };
  }
  const markingPart = raw.slice(0, delimIdx).trim();
  const custPart = raw.slice(delimIdx + 1); // keep trailing chars for real-time filtering
  return { markingPart, custPart, isTwoStage: true };
}

export default function MarkingCodeAutocomplete({ value, onChange, onSelect, required }: MarkingCodeAutocompleteProps) {
  const { t } = useTranslation();

  const [extraParams, setExtraParams] = useState<Record<string, string>>({});
  const [filterMode, setFilterMode] = useState<{ marking: string; cust: string } | null>(null);

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
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 10;
    if (bottom) {
      loadMore();
    }
  };

  const handleChange = useCallback((raw: string) => {
    const upperVal = raw.toUpperCase();
    setSearch(upperVal);
    onChange(upperVal);
    setIsOpen(true);

    const { markingPart, custPart, isTwoStage } = parseInput(upperVal);
    if (isTwoStage && markingPart) {
      setExtraParams({ markingCode: markingPart, custSearch: custPart.trim() });
      setFilterMode({ marking: markingPart, cust: custPart.trim() });
    } else {
      setExtraParams({});
      setFilterMode(null);
    }
  }, [onChange, setSearch, setIsOpen]);

  const handleSelectLocal = (data: EntryListData) => {
    const displayValue = data.fdMarkingCode;
    setSearch(displayValue);
    onChange(displayValue);
    onSelect(data);
    setIsOpen(false);
    setExtraParams({});
    setFilterMode(null);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        required={required}
        type="text"
        value={search}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        className="block w-full rounded-md border border-secondary/30 bg-surface px-3 py-2 text-[0.95rem] text-primary focus:border-tertiary focus:outline-none focus:ring-1 focus:ring-tertiary"
        placeholder={t('mc_search_placeholder')}
        autoComplete="off"
      />

      {/* Hint text below input */}
      {!filterMode && (
        <p className="mt-1 text-[0.68rem] text-secondary/70">{t('mc_filter_hint')}</p>
      )}

      {isOpen && (
        <div
          className="absolute z-10 w-full mt-1 bg-surface border border-secondary/20 rounded-md shadow-lg max-h-60 overflow-auto"
          onScroll={handleScroll}
        >
          {/* Filter mode label banner */}
          {filterMode && (
            <div className="px-3 py-1.5 text-[0.7rem] font-medium bg-tertiary/10 text-tertiary border-b border-tertiary/20 flex items-center gap-1.5">
              <span>🔍</span>
              <span>
                {t('mc_filter_mode', { marking: filterMode.marking, cust: filterMode.cust || '…' })}
              </span>
            </div>
          )}

          {isLoading ? (
            <div className="p-3 text-[0.95rem] text-secondary text-center">{t('state_loading')}</div>
          ) : options.length > 0 ? (
            <div className="flex flex-col">
              <ul className="py-1">
                {options.map((opt, idx) => (
                  <li
                    key={`${opt.fdListCode}-${idx}`}
                    onClick={() => handleSelectLocal(opt)}
                    className="px-3 py-2 text-[0.95rem] cursor-pointer hover:bg-neutral text-primary border-b border-secondary/10 last:border-0"
                  >
                    <div className="font-medium text-[#C26B5B]">
                      {opt.fdCustName || t('mc_unknown_cust')}
                    </div>
                    <div className="text-[0.72rem] text-secondary mt-0.5">
                      {opt.fdMarkingCode} | {t('mc_list')}: {opt.fdListCode} | {t('mc_no')}: {opt.fdMarkingNo}
                      {opt.fdTerima && opt.fdTerima.trim() !== '' && ` | Terima: ${opt.fdTerima.trim()}`}
                    </div>
                  </li>
                ))}
              </ul>
              {isLoadingMore && (
                <div className="px-3 py-2 text-xs text-center text-secondary border-t border-secondary/10">
                  {t('mc_loading_more')}
                </div>
              )}
              <div className="px-3 py-1.5 text-xs text-center text-secondary border-t border-secondary/20 bg-surface sticky bottom-0">
                {t('mc_showing_rows', { count: options.length })} {hasMore ? `(${t('mc_scroll_more')})` : `(${t('mc_all_loaded')})`}
              </div>
            </div>
          ) : (
            <div className="p-3 text-[0.95rem] text-secondary text-center">{t('mc_no_results')}</div>
          )}
        </div>
      )}
    </div>
  );
}
