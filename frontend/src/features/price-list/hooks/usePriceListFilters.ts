import { useState, useEffect } from "react";
import api from "../../../lib/api";
import type { FilterOptions } from "../types";

export function usePriceListFilters() {
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [sheetTypes, setSheetTypes] = useState<string[]>([]);
  const [mode, setMode] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
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
        // Default: pilih SEMUA tipe sheet (mis. CS & MKT sekaligus) supaya grafik
        // tren langsung membandingkan keduanya begitu dashboard dibuka, tanpa
        // user harus mencentang manual.
        setSheetTypes(data.sheetTypes ?? []);
        setMode(data.modes[0] ?? "");
        setCategories(data.categories[0] ? [data.categories[0]] : []);
      })
      .catch((err: any) => {
        console.error("Gagal memuat opsi filter price list:", err);
        setFilterError(err?.response?.data?.message || err?.message || "Gagal memuat filter");
      })
      .finally(() => setOptionsLoading(false));
  }, []);

  // Dependensi effect butuh nilai yang stabil per isi array (bukan identity
  // referensinya), sama seperti pola categoriesKey di atas.
  const sheetTypesKey = sheetTypes.join("|");

  useEffect(() => {
    if (sheetTypes.length === 0 || !mode) return;
    setCategoriesLoading(true);
    const params = new URLSearchParams();
    // Backend perlu menerima beberapa nilai "sheetType" (query array), sama
    // seperti "category" di bawah, dan memperlakukannya sebagai OR/IN filter —
    // supaya daftar kategori mencakup gabungan CS + MKT saat keduanya dipilih.
    for (const s of sheetTypes) {
      if (s) params.append("sheetType", s);
    }
    params.set("mode", mode);
    api.get(`/pricelist/filters?${params.toString()}`)
      .then((res) => {
        const cats: string[] = res.data?.categories ?? [];
        setCategoryOptions(cats);
        // Pertahankan kategori yang dipilih sebelumnya kalau masih tersedia di
        // mode baru; buang yang sudah tidak ada. Kalau jadi kosong, fallback
        // ke kategori pertama yang tersedia (bukan biarkan filter kosong).
        setCategories((prev) => {
          const stillValid = prev.filter((c) => cats.includes(c));
          if (stillValid.length > 0) return stillValid;
          return cats[0] ? [cats[0]] : [];
        });
      })
      .catch((err: any) => {
        console.error("Gagal memuat kategori untuk mode ini:", err);
        setFilterError(err?.response?.data?.message || err?.message || "Gagal memuat kategori");
      })
      .finally(() => setCategoriesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetTypesKey, mode]);

  return {
    options,
    optionsLoading,
    sheetTypes,
    setSheetTypes,
    mode,
    setMode,
    categories,
    setCategories,
    branch,
    setBranch,
    categoryOptions,
    categoriesLoading,
    filterError
  };
}
