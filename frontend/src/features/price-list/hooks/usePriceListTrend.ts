import { useState, useEffect, useMemo, useRef } from "react";
import api from "../../../lib/api";
import type { TrendPoint } from "../types";

// Satu "series" grafik = kombinasi KATEGORI + tipe sheet (mis. "General Goods"
// + "CS"). Dipakai kategori (bukan cabang) sebagai dimensi garis karena cabang
// sekarang selalu difilter ke satu nilai saja, sedangkan kategori & tipe sheet
// dua-duanya multi-select — jadi keduanya yang perlu dipisah supaya harganya
// tidak saling menimpa di baris tanggal yang sama.
export type TrendSeries = { key: string; category: string; sheetType: string };

// Separator dipilih karakter yang praktis tidak akan muncul di nama kategori/sheet
// asli (keduanya teks bebas dari data master), jadi aman dipakai sebagai bagian
// dari composite key series.
const SERIES_SEP = "__";

function seriesKey(category: string, sheetType: string) {
  return `${category}${SERIES_SEP}${sheetType}`;
}

export function usePriceListTrend(sheetTypes: string[], mode: string, categories: string[], branch: string) {
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  // isRefetching = sudah pernah punya data sebelumnya, jadi saat filter berubah
  // data lama tetap ditampilkan (chart tidak blank) sambil data baru dimuat.
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedOnce = useRef(false);

  // Dependensi effect butuh nilai yang stabil per isi array, bukan identity
  // referensinya, supaya tidak selalu re-fetch tiap kali objek array baru
  // dibuat oleh komponen induk walau isinya sama.
  const categoriesKey = categories.join("|");
  const sheetTypesKey = sheetTypes.join("|");

  useEffect(() => {
    if (sheetTypes.length === 0 && !mode && categories.length === 0) return;
    if (hasFetchedOnce.current) {
      setIsRefetching(true);
    } else {
      setLoading(true);
    }
    setError(null);
    const params = new URLSearchParams();
    // Backend perlu menerima beberapa nilai "sheetType" (query array), sama
    // seperti "category" di bawah, dan memperlakukannya sebagai OR / IN filter —
    // ini yang memungkinkan grafik menampilkan CS & MKT sekaligus.
    for (const s of sheetTypes) {
      if (s) params.append("sheetType", s);
    }
    if (mode) params.set("mode", mode);
    for (const c of categories) {
      if (c) params.append("category", c);
    }
    if (branch) params.set("branch", branch);

    api.get(`/pricelist/trend?${params.toString()}`)
      .then((res) => {
        setTrend(res.data);
      })
      .catch((err: any) => {
        console.error("Gagal memuat tren harga:", err);
        setError(err?.response?.data?.message || err?.message || "Gagal memuat tren harga");
      })
      .finally(() => {
        hasFetchedOnce.current = true;
        setLoading(false);
        setIsRefetching(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetTypesKey, mode, categoriesKey, branch]);

  const { chartData, series, yDomain, latestPrices, seriesTrend, maxPrice } = useMemo(() => {
    // seriesMap: satu entri per kombinasi kategori+sheet yang benar-benar muncul
    // di data, bukan per kategori saja — ini yang bikin CS & MKT untuk kategori
    // yang sama jadi dua garis terpisah, bukan saling menimpa.
    const seriesMap = new Map<string, TrendSeries>();
    const byDate = new Map<string, Record<string, number | string>>();
    const latest = new Map<string, { date: string; price: number }>();
    let min = Infinity;
    let max = -Infinity;

    for (const t of trend) {
      if (t.price === 0) continue;
      const key = seriesKey(t.category, t.sheetType);
      if (!seriesMap.has(key)) {
        seriesMap.set(key, { key, category: t.category, sheetType: t.sheetType });
      }
      const row = byDate.get(t.date) ?? { date: t.date };
      row[key] = t.price;
      byDate.set(t.date, row);
      if (t.price < min) min = t.price;
      if (t.price > max) max = t.price;
      const prevLatest = latest.get(key);
      if (!prevLatest || t.date >= prevLatest.date) {
        latest.set(key, { date: t.date, price: t.price });
      }
    }

    const padding = Number.isFinite(min) && Number.isFinite(max) ? (max - min) * 0.15 || max * 0.1 : 0;
    const latestPricesObj = Object.fromEntries(
      Array.from(latest.entries()).map(([k, v]) => [k, v.price])
    );
    const sortedDates = Array.from(byDate.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );

    const seriesTrendObj: Record<string, { delta: number; pct: number } | null> = {};
    for (const key of seriesMap.keys()) {
      const points = sortedDates
        .map((row) => row[key])
        .filter((v): v is number => typeof v === "number");
      if (points.length < 2) {
        seriesTrendObj[key] = null;
        continue;
      }
      const first = points[0];
      const last = points[points.length - 1];
      seriesTrendObj[key] = { delta: last - first, pct: first ? ((last - first) / first) * 100 : 0 };
    }

    return {
      chartData: sortedDates,
      series: Array.from(seriesMap.values()).sort(
        (a, b) => (latestPricesObj[b.key] ?? 0) - (latestPricesObj[a.key] ?? 0)
      ),
      yDomain: Number.isFinite(min) && Number.isFinite(max)
        ? [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)]
        : [0, "auto" as const],
      latestPrices: latestPricesObj,
      seriesTrend: seriesTrendObj,
      maxPrice: Number.isFinite(max) ? max : 0,
    };
  }, [trend]);

  return {
    trend,
    loading,
    isRefetching,
    error,
    chartData,
    series,
    yDomain,
    latestPrices,
    seriesTrend,
    maxPrice
  };
}
