import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useDebounce } from './useDebounce';

interface UseAutocompleteOptions<T> {
  endpoint: string;
  value: string;
  onChange: (val: string) => void;
  debounceMs?: number;
}

export function useAutocomplete<T>({ endpoint, value, onChange, debounceMs = 300 }: UseAutocompleteOptions<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const [options, setOptions] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const debouncedSearch = useDebounce(search, debounceMs);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  useEffect(() => {
    const fetchOptions = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`${endpoint}?search=${encodeURIComponent(debouncedSearch)}`);
        setOptions(response.data);
      } catch (error) {
        console.error(`Failed to fetch autocomplete options for ${endpoint}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchOptions();
    }
  }, [debouncedSearch, isOpen, endpoint]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (val: string) => {
    const upperVal = val.toUpperCase();
    setSearch(upperVal);
    onChange(upperVal);
    setIsOpen(true);
  };

  const handleSelect = (val: string) => {
    setSearch(val);
    onChange(val);
    setIsOpen(false);
  };

  return {
    isOpen,
    setIsOpen,
    search,
    setSearch,
    options,
    isLoading,
    wrapperRef,
    handleChange,
    handleSelect,
  };
}
