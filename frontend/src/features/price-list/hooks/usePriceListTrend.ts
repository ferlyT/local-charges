import { useState, useEffect, useMemo, useRef } from "react";
import api from "../../../lib/api";
import type { TrendPoint } from "../types";

export function usePriceListTrend(sheetType: string, mode: string, category: string, branch: string) {
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  // isRefetching = sudah pernah punya data sebelumnya, jadi saat filter berubah
  // data lama tetap ditampilkan (chart tidak blank) sambil data baru dimuat.
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedOnce = useRef(false);

  useEffect(() => {
    if (!sheetType && !mode && !category) return;
    if (hasFetchedOnce.current) {
      setIsRefetching(true);
    } else {
      setLoading(true);
    }
    setError(null);
    const params = new URLSearchParams();
    if (sheetType) params.set("sheetType", sheetType);
    if (mode) params.set("mode", mode);
    if (category) params.set("category", category);
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
  }, [sheetType, mode, category, branch]);

  const { chartData, branches, yDomain, latestPrices, branchTrend, maxPrice } = useMemo(() => {
    const branchSet = new Set<string>();
    const byDate = new Map<string, Record<string, number | string>>();
    const latest = new Map<string, { date: string; price: number }>();
    let min = Infinity;
    let max = -Infinity;
    
    for (const t of trend) {
      if (t.price === 0) continue;
      branchSet.add(t.branch);
      const row = byDate.get(t.date) ?? { date: t.date };
      row[t.branch] = t.price;
      byDate.set(t.date, row);
      if (t.price < min) min = t.price;
      if (t.price > max) max = t.price;
      const prevLatest = latest.get(t.branch);
      if (!prevLatest || t.date >= prevLatest.date) {
        latest.set(t.branch, { date: t.date, price: t.price });
      }
    }
    
    const padding = Number.isFinite(min) && Number.isFinite(max) ? (max - min) * 0.15 || max * 0.1 : 0;
    const latestPricesObj = Object.fromEntries(
      Array.from(latest.entries()).map(([d, v]) => [d, v.price])
    );
    const sortedDates = Array.from(byDate.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
    
    const branchTrendObj: Record<string, { delta: number; pct: number } | null> = {};
    for (const b of branchSet) {
      const points = sortedDates
        .map((row) => row[b])
        .filter((v): v is number => typeof v === "number");
      if (points.length < 2) {
        branchTrendObj[b] = null;
        continue;
      }
      const first = points[0];
      const last = points[points.length - 1];
      branchTrendObj[b] = { delta: last - first, pct: first ? ((last - first) / first) * 100 : 0 };
    }
    
    return {
      chartData: sortedDates,
      branches: Array.from(branchSet).sort(
        (a, b) => (latestPricesObj[b] ?? 0) - (latestPricesObj[a] ?? 0)
      ),
      yDomain: Number.isFinite(min) && Number.isFinite(max)
        ? [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)]
        : [0, "auto" as const],
      latestPrices: latestPricesObj,
      branchTrend: branchTrendObj,
      maxPrice: Number.isFinite(max) ? max : 0,
    };
  }, [trend]);

  return {
    trend,
    loading,
    isRefetching,
    error,
    chartData,
    branches,
    yDomain,
    latestPrices,
    branchTrend,
    maxPrice
  };
}
