import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';

interface CustomerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function CustomerAutocomplete({ value, onChange, required, disabled }: CustomerAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const [options, setOptions] = useState<{ fdCustName: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal search state with external value if it changes
  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  // Fetch from DB when debounced search changes
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/customers?search=${encodeURIComponent(debouncedSearch)}`);
        setOptions(response.data);
      } catch (error) {
        console.error('Failed to fetch customers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchCustomers();
    }
  }, [debouncedSearch, isOpen]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (custName: string) => {
    setSearch(custName);
    onChange(custName);
    setIsOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setSearch(val);
    onChange(val); // Also update the actual form state so it's not strictly restricted to dropdown
    setIsOpen(true);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        required={required}
        disabled={disabled}
        type="text"
        value={search}
        onChange={handleChange}
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
