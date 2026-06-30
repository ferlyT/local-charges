import React from 'react';
import { useAutocomplete } from '../hooks/useAutocomplete';

export interface EntryListData {
  fdListCode: string;
  fdMarkingCode: string;
  fdMarkingNo: string;
  fdCustName: string;
}

interface MarkingCodeAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (data: EntryListData) => void;
  required?: boolean;
}

export default function MarkingCodeAutocomplete({ value, onChange, onSelect, required }: MarkingCodeAutocompleteProps) {
  const {
    isOpen,
    setIsOpen,
    search,
    setSearch,
    options,
    isLoading,
    wrapperRef,
    handleChange
  } = useAutocomplete<EntryListData>({
    endpoint: '/inspection-reports/lookup',
    value,
    onChange
  });

  const handleSelectLocal = (data: EntryListData) => {
    setSearch(data.fdMarkingCode);
    onChange(data.fdMarkingCode);
    onSelect(data);
    setIsOpen(false);
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
        placeholder="Search Marking Code..."
        autoComplete="off"
      />
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-surface border border-secondary/20 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-3 text-[0.95rem] text-secondary text-center">Loading...</div>
          ) : options.length > 0 ? (
            <ul className="py-1">
              {options.map((opt) => (
                <li
                  key={`${opt.fdListCode}-${opt.fdMarkingCode}`}
                  onClick={() => handleSelectLocal(opt)}
                  className="px-3 py-2 text-[0.95rem] cursor-pointer hover:bg-neutral text-primary"
                >
                  <div className="font-medium text-tertiary">{opt.fdMarkingCode}</div>
                  <div className="text-[0.72rem] text-secondary">
                    {opt.fdCustName || 'Unknown Customer'} | List: {opt.fdListCode} | No: {opt.fdMarkingNo}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-[0.95rem] text-secondary text-center">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
