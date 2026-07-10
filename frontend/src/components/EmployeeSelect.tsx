import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';

interface Employee {
  fdEmpName: string;
  fdEmpTitle: string;
}

interface EmployeeSelectProps {
  role: 'direquest' | 'billing' | 'ar';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function EmployeeSelect({ role, value, onChange, placeholder, disabled }: EmployeeSelectProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync search field with external value (e.g. when form loads existing data)
  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  // Load employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/employees?role=${role}`);
        setEmployees(res.data);
      } catch {
        setEmployees([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, [role]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = employees.filter((emp) =>
    emp.fdEmpName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (emp: Employee) => {
    setSearch(emp.fdEmpName);
    onChange(emp.fdEmpName);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearch('');
    onChange('');
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          placeholder={placeholder || 'Pilih atau cari karyawan...'}
          autoComplete="off"
          className={`form-input w-full pr-8 ${disabled ? 'bg-neutral/60 text-secondary cursor-not-allowed border-secondary/15' : ''}`}
        />
        {search && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary/50 hover:text-secondary transition-colors text-lg leading-none"
            tabIndex={-1}
          >
            ×
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-20 w-full mt-1 bg-surface border border-secondary/20 rounded-md shadow-lg max-h-52 overflow-auto">
          {isLoading ? (
            <div className="p-3 text-[0.9rem] text-secondary text-center">Loading...</div>
          ) : filtered.length > 0 ? (
            <ul className="py-1">
              {filtered.map((emp) => (
                <li
                  key={emp.fdEmpName}
                  onMouseDown={() => handleSelect(emp)}
                  className="px-3 py-2 text-[0.9rem] cursor-pointer hover:bg-neutral text-primary flex items-center justify-between"
                >
                  <span className="font-medium">{emp.fdEmpName}</span>
                  <span className="text-[0.7rem] text-secondary/60 uppercase tracking-wide ml-2">{emp.fdEmpTitle}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-[0.9rem] text-secondary text-center">Tidak ada hasil</div>
          )}
        </div>
      )}
    </div>
  );
}
