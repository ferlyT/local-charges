import React from 'react';
import { useAutocomplete } from '../hooks/useAutocomplete';

interface CustomerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function CustomerAutocomplete({ value, onChange, required, disabled }: CustomerAutocompleteProps) {
  const {
    isOpen,
    setIsOpen,
    search,
    options,
    isLoading,
    wrapperRef,
    handleChange,
    handleSelect
  } = useAutocomplete<{ fdCustName: string }>({
    endpoint: '/customers',
    value,
    onChange
  });

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        required={required}
        disabled={disabled}
        type="text"
        value={search}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => !disabled && setIsOpen(true)}
        className={`block w-full rounded-md border border-secondary/30 px-3 py-2 text-[0.95rem] focus:outline-none focus:ring-1 focus:ring-tertiary focus:border-tertiary ${
          disabled 
            ? 'bg-neutral/50 text-secondary cursor-not-allowed' 
            : 'bg-surface text-primary'
        }`}
        placeholder="Search customer name..."
        autoComplete="off"
      />
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-surface border border-secondary/20 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-3 text-[0.95rem] text-secondary text-center">Loading...</div>
          ) : options.length > 0 ? (
            <ul className="py-1">
              {options.map((opt, i) => (
                <li
                  key={i}
                  onClick={() => handleSelect(opt.fdCustName)}
                  className="px-3 py-2 text-[0.95rem] cursor-pointer hover:bg-neutral text-primary"
                >
                  <div className="font-medium text-tertiary">{opt.fdCustName}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-[0.95rem] text-secondary text-center">No customers found</div>
          )}
        </div>
      )}
    </div>
  );
}
