import { useState, useEffect } from "react";
import api from "../../../lib/api";
import type { FilterOptions } from "../types";

export function usePriceListFilters() {
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  
  const [sheetType, setSheetType] = useState("");
  const [mode, setMode] = useState("");
  const [category, setCategory] = useState("");
  const [branch, setBranch] = useState("");
  
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  
  const [filterError, setFilterError] = useState<string | null>(null);

  useEffect(() => {
    setOptionsLoading(true);
    api.get("/pricelist/filters")
      .then((res) => {
        const data: FilterOptions = res.data;
        setOptions(data);
        setCategoryOptions(data.categories);
        setSheetType(data.sheetTypes[0] ?? "");
        setMode(data.modes[0] ?? "");
        setCategory(data.categories[0] ?? "");
      })
      .catch((err: any) => {
        console.error("Gagal memuat opsi filter price list:", err);
        setFilterError(err?.response?.data?.message || err?.message || "Gagal memuat filter");
      })
      .finally(() => setOptionsLoading(false));
  }, []);

  useEffect(() => {
    if (!sheetType || !mode) return;
    setCategoriesLoading(true);
    const params = new URLSearchParams();
    params.set("sheetType", sheetType);
    params.set("mode", mode);
    api.get(`/pricelist/filters?${params.toString()}`)
      .then((res) => {
        const cats: string[] = res.data?.categories ?? [];
        setCategoryOptions(cats);
        setCategory((prev) => (cats.includes(prev) ? prev : cats[0] ?? ""));
      })
      .catch((err: any) => {
        console.error("Gagal memuat kategori untuk mode ini:", err);
        setFilterError(err?.response?.data?.message || err?.message || "Gagal memuat kategori");
      })
      .finally(() => setCategoriesLoading(false));
  }, [sheetType, mode]);

  return {
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
    filterError
  };
}
