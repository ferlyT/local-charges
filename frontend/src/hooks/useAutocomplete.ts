import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useDebounce } from './useDebounce';

interface UseAutocompleteOptions<T> {
  endpoint: string;
  value: string;
  onChange: (val: string) => void;
  debounceMs?: number;
  isPaginated?: boolean;
  extraParams?: Record<string, string>;
}

export function useAutocomplete<T>({ endpoint, value, onChange, debounceMs = 300, isPaginated = false, extraParams = {} }: UseAutocompleteOptions<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const [options, setOptions] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const debouncedSearch = useDebounce(search, debounceMs);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  useEffect(() => {
    // Reset pagination when search changes
    setPage(1);
    setHasMore(true);
  }, [debouncedSearch]);

  useEffect(() => {
    const fetchOptions = async () => {
      // If not paginated or first page, show main loader
      if (!isPaginated || page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      try {
        let url = `${endpoint}?search=${encodeURIComponent(debouncedSearch)}`;
        if (isPaginated) {
          url += `&page=${page}&limit=20`;
        }
        // Append any extra params (e.g. markingCode, custSearch)
        Object.entries(extraParams).forEach(([key, val]) => {
          if (val !== undefined && val !== '') {
            url += `&${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
          }
        });
        
        const response = await api.get(url);
        
        if (isPaginated) {
          if (page === 1) {
            setOptions(response.data);
          } else {
            setOptions(prev => [...prev, ...response.data]);
          }
          // If returned data length is less than limit, no more data
          if (response.data.length < 20) {
            setHasMore(false);
          }
        } else {
          setOptions(response.data);
        }
      } catch (error) {
        console.error(`Failed to fetch autocomplete options for ${endpoint}:`, error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    };

    if (isOpen) {
      fetchOptions();
    }
  }, [debouncedSearch, isOpen, endpoint, page, isPaginated, JSON.stringify(extraParams)]);

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

  const loadMore = () => {
    if (isPaginated && hasMore && !isLoading && !isLoadingMore) {
      setPage(prev => prev + 1);
    }
  };

  return {
    isOpen,
    setIsOpen,
    search,
    setSearch,
    options,
    isLoading,
    isLoadingMore,
    hasMore,
    wrapperRef,
    handleChange,
    handleSelect,
    loadMore
  };
}
