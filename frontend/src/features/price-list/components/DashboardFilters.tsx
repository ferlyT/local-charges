import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { Search, ChevronDown, SlidersHorizontal, RotateCcw, TrendingUp, Anchor, Plane } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FilterOptions } from "../types";

export function DashboardFilters({
  options,
  optionsLoading,
  sheetType,
  setSheetType,
  mode,
  setMode,
  category,
  setCategory,
  branch,
  setBranch,
  categoryOptions,
  categoriesLoading,
  branches,
  chartDataLength
}: {
  options: FilterOptions | null;
  optionsLoading: boolean;
  sheetType: string;
  setSheetType: (v: string) => void;
  mode: string;
  setMode: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  branch: string;
  setBranch: (v: string) => void;
  categoryOptions: string[];
  categoriesLoading: boolean;
  branches: string[];
  chartDataLength: number;
}) {
  const [filtersExpanded, setFiltersExpanded] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 640px)").matches
  );
  // Overflow-hidden dibutuhkan SELAMA animasi buka/tutup, tapi begitu panel sudah
  // penuh terbuka, harus dilepas — kalau tidak, dropdown "Kategori Barang" yang
  // meluas ke bawah ikut terpotong (paling kerasa di mobile, layout 1 kolom).
  const [panelSettled, setPanelSettled] = useState(filtersExpanded);

  useEffect(() => {
    if (filtersExpanded) {
      const t = setTimeout(() => setPanelSettled(true), 300);
      return () => clearTimeout(t);
    }
    setPanelSettled(false);
  }, [filtersExpanded]);

  return (
    <div className="card p-4 sm:p-5 rounded-xl sticky top-4 z-20 shadow-lg border-secondary/20 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div
        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition-all duration-300 ${filtersExpanded ? "mb-4 pb-3 border-b border-secondary/10" : ""
          }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFiltersExpanded((v) => !v)}
            aria-expanded={filtersExpanded}
            className="flex items-center gap-2 shrink-0 py-1 -my-1"
          >
            <div className="p-1.5 rounded-lg bg-tertiary/10">
              <SlidersHorizontal size={14} className="text-tertiary" />
            </div>
            <span className="text-[0.8rem] font-semibold text-primary">Filter Data</span>
            <ChevronDown
              size={14}
              className={`text-secondary transition-transform duration-150 ${filtersExpanded ? "rotate-180" : ""}`}
            />
          </button>
          {(branch || (categoryOptions.length > 0 && category !== categoryOptions[0])) && (
            <button
              type="button"
              onClick={() => {
                setBranch("");
                setCategory(categoryOptions[0] ?? "");
              }}
              className="flex items-center gap-1 text-[0.75rem] font-medium text-tertiary hover:underline"
            >
              <RotateCcw size={11} />
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral text-[0.78rem] font-medium text-secondary self-start sm:self-auto shrink-0">
          <TrendingUp size={13} className="text-tertiary shrink-0" />
          <span>
            {branches.length > 0
              ? `${branches.length} cabang • ${chartDataLength} titik data`
              : "Pilih filter untuk melihat tren"}
          </span>
        </div>
      </div>

      {/* Ringkasan versi tertutup — crossfade dengan panel filter penuh, bukan hard-swap */}
      <div
        className={`grid transition-all duration-200 ease-out ${filtersExpanded ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100 mt-2"}`}
      >
        <div className="overflow-hidden">
          <button
            type="button"
            onClick={() => setFiltersExpanded(true)}
            className="w-full flex items-center gap-1.5 text-[0.78rem] text-secondary text-left truncate py-1"
          >
            <span className="truncate">
              {sheetType || "—"} · {mode || "—"} · {category || "—"} · {branch || "Semua Cabang"}
            </span>
            <span className="text-tertiary font-medium shrink-0">Ubah</span>
          </button>
        </div>
      </div>

      {/* Panel filter — dianimasikan dengan grid-rows (0fr <-> 1fr) supaya buka/tutup terasa
          seperti accordion halus, bukan konten yang langsung muncul/hilang begitu saja. */}
      <div
        className={`grid transition-all duration-300 ease-out ${filtersExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className={panelSettled ? "overflow-visible" : "overflow-hidden"}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
            {optionsLoading ? (
              <>
                <div className="lg:col-span-2 space-y-1.5">
                  <div className="h-3 w-16 skeleton rounded" />
                  <div className="h-9 w-full skeleton rounded-lg" />
                </div>
                <div className="lg:col-span-3 space-y-1.5">
                  <div className="h-3 w-14 skeleton rounded" />
                  <div className="h-9 w-full skeleton rounded-lg" />
                </div>
                <div className="lg:col-span-4 space-y-1.5">
                  <div className="h-3 w-24 skeleton rounded" />
                  <div className="h-9 w-full skeleton rounded-lg" />
                </div>
                <div className="lg:col-span-3 space-y-1.5">
                  <div className="h-3 w-14 skeleton rounded" />
                  <div className="h-9 w-full skeleton rounded-lg" />
                </div>
              </>
            ) : (
              <>
                <div className="lg:col-span-2">
                  <SegmentedControl
                    label="Tipe Sheet"
                    value={sheetType}
                    onChange={setSheetType}
                    options={options?.sheetTypes ?? []}
                  />
                </div>
                <div className="lg:col-span-3">
                  <SegmentedControl
                    label="Mode"
                    value={mode}
                    onChange={setMode}
                    options={options?.modes ?? []}
                    getIcon={(o) => {
                      const v = o.toLowerCase();
                      if (v.includes("sea") || v.includes("laut")) return Anchor;
                      if (v.includes("air") || v.includes("udara")) return Plane;
                      return undefined;
                    }}
                  />
                </div>
                <div className="lg:col-span-4">
                  <CategoryCombobox
                    label="Kategori Barang"
                    value={category}
                    onChange={setCategory}
                    options={categoryOptions}
                    loading={categoriesLoading}
                    helperText={mode ? `mengikuti ${mode}` : undefined}
                  />
                </div>
                <div className="lg:col-span-3">
                  <PillToggle
                    label="Cabang"
                    value={branch}
                    onChange={setBranch}
                    options={options?.branches ?? []}
                    allowClear
                    clearLabel="Semua Cabang"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SegmentedControl({
  label,
  value,
  onChange,
  options,
  getIcon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  getIcon?: (option: string) => LucideIcon | undefined;
}) {
  if (options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">
          {label}
        </label>
        <div className="px-3 py-2 rounded-lg bg-neutral text-sm text-secondary">— Tidak ada data —</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">
        {label}
      </label>
      <div className="inline-flex flex-wrap bg-neutral rounded-lg p-[3px] gap-0.5">
        {options.map((o) => {
          const Icon = getIcon?.(o);
          const active = value === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${active
                  ? "bg-surface border border-secondary/20 text-primary shadow-sm"
                  : "border border-transparent text-secondary hover:text-primary"
                }`}
            >
              {Icon && <Icon size={14} />}
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CategoryCombobox({
  label,
  value,
  onChange,
  options,
  allowClear = false,
  clearLabel = "Semua",
  searchPlaceholder = "Cari kategori...",
  loading = false,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allowClear?: boolean;
  clearLabel?: string;
  searchPlaceholder?: string;
  loading?: boolean;
  helperText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open]);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.trim().toLowerCase())
  );
  const selectable = allowClear ? [{ value: "", label: clearLabel }, ...filtered.map((o) => ({ value: o, label: o }))] : filtered.map((o) => ({ value: o, label: o }));

  useEffect(() => {
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function commit(v: string) {
    onChange(v);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleSearchKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, selectable.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectable[activeIndex]) commit(selectable[activeIndex].value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  const displayValue = value || (allowClear ? clearLabel : "");

  return (
    <div className="flex flex-col gap-1.5 relative" ref={containerRef}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">
          {label}
        </label>
        {helperText && !loading && (
          <span className="text-[0.68rem] text-secondary/70 truncate max-w-[55%] text-right">{helperText}</span>
        )}
      </div>
      <div className="relative w-full">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={options.length === 0 || loading}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="form-input py-2 pl-3 pr-9 text-sm w-full flex items-center justify-between gap-2 text-left disabled:opacity-60"
        >
          <span className={`truncate ${!value && !allowClear ? "text-secondary" : "text-primary"}`}>
            {loading ? "Memuat kategori..." : displayValue || searchPlaceholder}
          </span>
          {loading ? (
            <span className="w-3.5 h-3.5 border-2 border-secondary/30 border-t-tertiary rounded-full animate-spin shrink-0" />
          ) : (
            <ChevronDown
              size={14}
              className={`text-secondary shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            />
          )}
        </button>

        {open && options.length > 0 && (
          <div
            role="listbox"
            className="absolute z-30 mt-1.5 w-full rounded-lg border border-secondary/20 bg-surface shadow-lg overflow-hidden"
          >
            <div className="relative border-b border-secondary/10 p-1.5">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-7 pr-2 py-1.5 text-sm bg-transparent outline-none placeholder:text-secondary/60"
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {selectable.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-secondary">Tidak ditemukan.</p>
              ) : (
                selectable.map((opt, i) => (
                  <button
                    key={opt.value || "__clear__"}
                    ref={(el) => { optionRefs.current[i] = el; }}
                    type="button"
                    onClick={() => commit(opt.value)}
                    onMouseEnter={() => setActiveIndex(i)}
                    role="option"
                    aria-selected={opt.value === value}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 sm:py-2 text-sm text-left transition-colors ${i === activeIndex ? "bg-neutral" : ""
                      } ${opt.value === "" && allowClear ? "italic text-secondary" : "text-primary"}`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {opt.value === value && (
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PillToggle({
  label,
  value,
  onChange,
  options,
  allowClear = false,
  clearLabel = "Semua",
  loading = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allowClear?: boolean;
  clearLabel?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">
          {label}
        </label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-16 skeleton rounded-full" />
          ))}
        </div>
      </div>
    );
  }
  if (options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">
          {label}
        </label>
        <div className="px-3 py-2 rounded-lg bg-neutral text-sm text-secondary">— Tidak ada data —</div>
      </div>
    );
  }
  const pills = allowClear ? [{ v: "", label: clearLabel }, ...options.map((o) => ({ v: o, label: o }))] : options.map((o) => ({ v: o, label: o }));
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {pills.map((p) => {
          const active = value === p.v;
          return (
            <button
              key={p.v || "__clear__"}
              type="button"
              onClick={() => onChange(p.v)}
              aria-pressed={active}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${active
                  ? "bg-tertiary/10 border-tertiary/40 text-tertiary font-semibold shadow-sm"
                  : "bg-surface border-secondary/20 text-secondary hover:text-primary hover:border-secondary/35"
                } ${p.v === "" && allowClear && !active ? "italic" : ""}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
