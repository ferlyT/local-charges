import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../../lib/api";
import { useTranslation } from "../../../hooks/useTranslation";
import { ArrowLeft, AlertCircle, TrendingUp, TrendingDown, Minus, Sparkles, Filter } from "lucide-react";

interface DiffRow {
  sheetType: string;
  mode: string;
  branch: string;
  category: string;
  currentPrice: number;
  previousPrice: number | null;
  delta: number | null;
  deltaPct: number | null;
}

interface DiffResponse {
  currentUploadId: number;
  currentEffectiveDate: string;
  previousUploadId: number | null;
  previousEffectiveDate: string | null;
  diff: DiffRow[];
}

function formatRupiah(v: number) {
  return v.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
}

export default function Detail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const uploadId = Number(id);

  const [data, setData]               = useState<DiffResponse | null>(null);
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [activeKpi, setActiveKpi]     = useState<"all" | "naik" | "turun" | "tetap" | "baru">("all");
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (!uploadId) return;
    setLoading(true);
    api.get(`/pricelist/uploads/${uploadId}/diff`)
      .then((res) => setData(res.data))
      .catch((err: any) => {
        setError(err?.response?.data?.message || err?.message || "Gagal memuat detail upload");
      })
      .finally(() => setLoading(false));
  }, [uploadId]);

  let rows = data ? data.diff : [];
  
  if (onlyChanged) {
    rows = rows.filter((r) => r.delta !== null && r.delta !== 0);
  }

  if (activeKpi !== "all") {
    rows = rows.filter((r) => {
      if (activeKpi === "naik") return r.delta !== null && r.delta > 0;
      if (activeKpi === "turun") return r.delta !== null && r.delta < 0;
      if (activeKpi === "tetap") return r.delta !== null && r.delta === 0;
      if (activeKpi === "baru") return r.delta === null;
      return true;
    });
  }

  const stats = data ? {
    naik:  data.diff.filter((r) => r.delta !== null && r.delta > 0).length,
    turun: data.diff.filter((r) => r.delta !== null && r.delta < 0).length,
    tetap: data.diff.filter((r) => r.delta !== null && r.delta === 0).length,
    baru:  data.diff.filter((r) => r.delta === null).length,
  } : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2 border-b border-secondary/10">
        <div>
          <h1 className="text-[2.6rem] font-display text-primary tracking-[-0.02em] leading-none mb-2">
            {t('pl_detail_title', { id: uploadId })}
          </h1>
          <p className="text-[0.95rem] text-secondary">
            {loading
              ? t('state_loading')
              : data
              ? (
                <>
                  {t('pl_detail_effective')} {" "}
                  <strong className="text-primary">
                    {new Date(data.currentEffectiveDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </strong>
                  {" — "}
                  {data.previousUploadId
                    ? t('pl_detail_compared', { date: new Date(data.previousEffectiveDate!).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) })
                    : t('pl_detail_first')}
                </>
              )
              : null}
          </p>
        </div>
        <Link
          to="/pricelist/uploads"
          className="btn-secondary inline-flex items-center gap-2 shrink-0"
        >
          <ArrowLeft size={16} />
          {t('pl_btn_history')}
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-500/25 bg-rose-500/5 px-4 py-3.5 text-sm text-rose-600">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      {!loading && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard 
            icon={<TrendingUp size={18} className="text-rose-500" />} 
            label="Naik" 
            value={stats.naik} 
            color="rose" 
            isActive={activeKpi === "naik"}
            onClick={() => setActiveKpi(prev => prev === "naik" ? "all" : "naik")}
          />
          <StatCard 
            icon={<TrendingDown size={18} className="text-emerald-600" />} 
            label="Turun" 
            value={stats.turun} 
            color="emerald" 
            isActive={activeKpi === "turun"}
            onClick={() => setActiveKpi(prev => prev === "turun" ? "all" : "turun")}
          />
          <StatCard 
            icon={<Minus size={18} className="text-secondary" />} 
            label="Tetap" 
            value={stats.tetap} 
            color="secondary" 
            isActive={activeKpi === "tetap"}
            onClick={() => setActiveKpi(prev => prev === "tetap" ? "all" : "tetap")}
          />
          <StatCard 
            icon={<Sparkles size={18} className="text-tertiary" />} 
            label="Baru" 
            value={stats.baru} 
            color="tertiary" 
            isActive={activeKpi === "baru"}
            onClick={() => setActiveKpi(prev => prev === "baru" ? "all" : "baru")}
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-surface shadow-md border border-secondary/20 rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-secondary/10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-secondary" />
            <h2 className="text-[1rem] font-semibold text-primary">
              {rows.length} baris harga
            </h2>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setOnlyChanged((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${onlyChanged ? "bg-tertiary" : "bg-secondary/25"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${onlyChanged ? "translate-x-4" : ""}`} />
            </div>
            <span className="text-sm text-secondary font-medium">
              Yang berubah saja
            </span>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary/20">
            <thead className="bg-neutral/50">
              <tr>
                {["Tipe", "Mode", "Cabang", "Kategori Barang", "Harga Sebelumnya", "Harga Sekarang", "Perubahan"].map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={`px-6 py-4 text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase ${i >= 4 ? "text-right" : "text-left"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary/15">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className={`h-4 skeleton ${j === 3 ? "w-40" : "w-20"}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <p className="text-secondary text-sm">Tidak ada data yang ditampilkan.</p>
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="hover:bg-neutral/40 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[0.78rem] font-mono font-semibold bg-tertiary/10 text-tertiary px-2 py-0.5 rounded">
                        {r.sheetType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[0.9rem] text-secondary">{r.mode}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-[0.85rem] font-semibold text-primary">{r.branch}</span>
                    </td>
                    <td className="px-6 py-4 text-[0.9rem] text-primary max-w-[220px] truncate">{r.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-[0.88rem] font-mono text-secondary/70">
                      {r.previousPrice !== null ? formatRupiah(r.previousPrice) : <span className="text-secondary/30">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-[0.9rem] font-mono font-semibold text-primary">
                      {formatRupiah(r.currentPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {r.delta === null ? (
                        <span className="badge bg-tertiary/10 text-tertiary border-tertiary/20">Baru</span>
                      ) : r.delta === 0 ? (
                        <span className="badge bg-secondary/10 text-secondary border-secondary/20">Tetap</span>
                      ) : r.delta > 0 ? (
                        <span className="badge bg-rose-500/10 text-rose-600 border-rose-500/20 inline-flex items-center gap-1">
                          <TrendingUp size={11} />
                          +{r.deltaPct?.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="badge bg-emerald-500/10 text-emerald-600 border-emerald-500/20 inline-flex items-center gap-1">
                          <TrendingDown size={11} />
                          {r.deltaPct?.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, isActive, onClick }: { icon: React.ReactNode; label: string; value: number; color: string; isActive?: boolean; onClick?: () => void }) {
  const colorMap: Record<string, string> = {
    rose:      "bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10",
    emerald:   "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10",
    secondary: "bg-secondary/5 border-secondary/20 hover:bg-secondary/10",
    tertiary:  "bg-tertiary/5 border-tertiary/20 hover:bg-tertiary/10",
  };
  const activeClassMap: Record<string, string> = {
    rose:      "ring-2 ring-rose-500 bg-rose-500/10",
    emerald:   "ring-2 ring-emerald-500 bg-emerald-500/10",
    secondary: "ring-2 ring-secondary/50 bg-secondary/10",
    tertiary:  "ring-2 ring-tertiary bg-tertiary/10",
  };
  return (
    <div 
      className={`card p-4 border flex items-center gap-3 cursor-pointer transition-all duration-200 ${colorMap[color] ?? ""} ${isActive ? activeClassMap[color] : ""}`}
      onClick={onClick}
    >
      <div className="p-2 rounded-lg bg-surface/80">{icon}</div>
      <div>
        <div className="text-[1.5rem] font-bold font-mono text-primary leading-none">{value}</div>
        <div className="text-[0.72rem] uppercase tracking-wider text-secondary font-semibold mt-0.5">{label}</div>
      </div>
    </div>
  );
}
