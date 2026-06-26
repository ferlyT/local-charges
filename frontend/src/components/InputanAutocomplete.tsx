import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';

export interface InputanData {
  fdNoInputan: string;
  fdCustName: string;
  fdMarking: string;
  fdNoReceipt: string;
  fdNoBilling: string;
}

interface InputanAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (data: InputanData) => void;
  required?: boolean;
}

export default function InputanAutocomplete({ value, onChange, onSelect, required }: InputanAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const [options, setOptions] = useState<InputanData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal search state with external value if it changes
  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  // Fetch from DB when debounced search changes
  useEffect(() => {
    const fetchInputan = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/inputan?search=${encodeURIComponent(debouncedSearch)}`);
        setOptions(response.data);
      } catch (error) {
        console.error('Failed to fetch inputan:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchInputan();
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

  const handleSelect = (data: InputanData) => {
    setSearch(data.fdNoInputan);
    onChange(data.fdNoInputan);
    onSelect(data);
    setIsOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setSearch(val);
    onChange(val);
    setIsOpen(true);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        required={required}
        type="text"
        value={search}
        onChange={handleChange}
        onFocus={() => setIsOpen(true)}
        className="block w-full rounded-md border border-secondary/30 bg-surface px-3 py-2 text-[0.95rem] text-primary focus:border-tertiary focus:outline-none focus:ring-1 focus:ring-tertiary"
        placeholder="Search No. Inputan..."
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
                  key={opt.fdNoInputan}
                  onClick={() => handleSelect(opt)}
                  className="px-3 py-2 text-[0.95rem] cursor-pointer hover:bg-neutral text-primary"
                >
                  <div className="font-medium text-tertiary">{opt.fdNoInputan}</div>
                  <div className="text-[0.72rem] text-secondary">
                    {opt.fdCustName} | {opt.fdMarking} | {opt.fdNoReceipt}{opt.fdNoBilling ? ` | ${opt.fdNoBilling}` : ''}
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
