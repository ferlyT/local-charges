import { useState, useEffect } from "react";
import api from "../../../lib/api";

export interface PriceDiffItem {
  sheetType: string;
  mode: string;
  branch: string;
  category: string;
  currentPrice: number;
  previousPrice: number | null;
  delta: number | null;
  deltaPct: number | null;
}

interface LatestDiffResponse {
  currentUploadId: number;
  currentEffectiveDate: string;
  previousUploadId: number | null;
  previousEffectiveDate: string | null;
  diff: PriceDiffItem[];
}

export function useLatestPriceDiff() {
  const [data, setData] = useState<LatestDiffResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get("/pricelist/uploads/latest/diff")
      .then((res) => setData(res.data))
      .catch((err: any) => {
        // Belum ada upload sama sekali bukan error yang perlu ditampilkan sebagai gagal
        if (err?.response?.status === 404) {
          setData(null);
          return;
        }
        console.error("Gagal memuat perubahan harga terbaru:", err);
        setError(err?.response?.data?.message || err?.message || "Gagal memuat perubahan harga");
      })
      .finally(() => setLoading(false));
  }, []);

  const diff = data?.diff ?? [];
  const naik = diff
    .filter((d) => d.delta !== null && d.delta > 0)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
  const turun = diff
    .filter((d) => d.delta !== null && d.delta < 0)
    .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0));
  const tetapCount = diff.filter((d) => d.delta === 0).length;
  const baruCount = diff.filter((d) => d.previousPrice === null).length;

  return {
    loading,
    error,
    currentEffectiveDate: data?.currentEffectiveDate ?? null,
    previousEffectiveDate: data?.previousEffectiveDate ?? null,
    naik,
    turun,
    tetapCount,
    baruCount,
  };
}
