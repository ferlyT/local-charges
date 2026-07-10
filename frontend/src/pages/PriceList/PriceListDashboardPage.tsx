import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { useTranslation } from "../../hooks/useTranslation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Upload,
  History,
  AlertCircle,
  BarChart3,
  LineChart as LineChartIcon,
  Table as TableIcon,
  Search,
  X,
  ChevronDown,
  Check,
  Anchor,
  Plane,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

function formatRupiah(v: number) {
  return `Rp ${v.toLocaleString("id-ID")}`;
}

interface TrendPoint {
  uploadId: number;
  date: string;
  sheetType: string;
  mode: string;
  branch: string;
  category: string;
  price: number;
}

interface FilterOptions {
  sheetTypes: string[];
  modes: string[];
  branches: string[];
  categories: string[];
}

// Fixed categorical palette — chosen so adjacent lines never look alike
// (previous set mixed orange/red/maroon tones that were hard to tell apart)
const LINE_COLORS = [
  "#2a78d6", // blue
  "#1baf7a", // aqua/green
  "#eda100", // yellow
  "#4a3aa7", // violet
  "#e34948", // red
  "#e87ba4", // magenta
  "#eb6834", // orange
];

export default function PriceListDashboardPage() {
  const { t } = useTranslation();
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [sheetType, setSheetType] = useState("");
  const [mode, setMode] = useState("");
  const [category, setCategory] = useState("");
  const [branch, setBranch] = useState("");
  const [priceAsOfDate, setPriceAsOfDate] = useState("");
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);

  // Kontrol keterbacaan grafik: sembunyikan/soroti cabang tertentu,
  // cari cabang spesifik, dan alihkan ke tabel saat butuh angka pasti.
  const [hiddenBranches, setHiddenBranches] = useState<Set<string>>(new Set());
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const [branchQuery, setBranchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  useEffect(() => {
    setOptionsLoading(true);
    api.get("/pricelist/filters")
      .then((res) => {
        const data: FilterOptions = res.data;
        setOptions(data);
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
    if (!sheetType && !mode && !category) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (sheetType) params.set("sheetType", sheetType);
    if (mode) params.set("mode", mode);
    if (category) params.set("category", category);
    if (branch) params.set("branch", branch);
    api.get(`/pricelist/trend?${params.toString()}`)
      .then((res) => {
        const data: TrendPoint[] = res.data;
        setTrend(data);
      })
      .catch((err: any) => {
        console.error("Gagal memuat tren harga:", err);
        setFilterError(err?.response?.data?.message || err?.message || "Gagal memuat tren harga");
      })
      .finally(() => setLoading(false));
  }, [sheetType, mode, category, branch]);

  // pivot: satu baris per tanggal, satu kolom per cabang, untuk multi-line chart
  const { chartData, branches, yDomain, latestPrices } = useMemo(() => {
    const branchSet = new Set<string>();
    const byDate = new Map<string, Record<string, number | string>>();
    const latest = new Map<string, { date: string; price: number }>();
    let min = Infinity;
    let max = -Infinity;
    for (const t of trend) {
      // Harga 0 berarti "rute belum tersedia", bukan harga beneran — kalau
      // ikut dihitung, KPI "termurah"/"termahal" dan grafik jadi salah baca.
      // Parser sudah dibenahi supaya tidak menyimpan ini lagi ke depannya,
      // ini jaga-jaga untuk data lama yang mungkin masih tersimpan.
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
    // Beri padding ~10% di atas & bawah supaya garis tidak menempel tepi,
    // tapi tetap jauh lebih ketat daripada mulai dari 0 — perbedaan harga
    // antar cabang jadi terlihat, bukan numpuk di bagian atas grafik.
    const padding = Number.isFinite(min) && Number.isFinite(max) ? (max - min) * 0.15 || max * 0.1 : 0;
    const latestPrices = Object.fromEntries(
      Array.from(latest.entries()).map(([d, v]) => [d, v.price])
    );
    return {
      chartData: Array.from(byDate.values()).sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      ),
      // Diurutkan dari harga terbaru tertinggi ke terendah — legenda dan
      // tabel jadi langsung menunjukkan mana yang termahal tanpa dihitung manual.
      branches: Array.from(branchSet).sort(
        (a, b) => (latestPrices[b] ?? 0) - (latestPrices[a] ?? 0)
      ),
      yDomain: Number.isFinite(min) && Number.isFinite(max)
        ? [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)]
        : [0, "auto" as const],
      latestPrices,
    };
  }, [trend]);

  // Reset kontrol tampilan setiap kali kombinasi filter (dan datanya) berubah,
  // supaya cabang yang disembunyikan di filter sebelumnya tidak "nyangkut".
  useEffect(() => {
    setHiddenBranches(new Set());
    setActiveBranch(null);
    setBranchQuery("");
    setBranch("");
    setPriceAsOfDate("");
  }, [sheetType, mode, category]);

  // Detail harga presisi untuk kombinasi kategori + cabang yang dipilih —
  // dipakai buat kartu "Harga Saat Ini". Kalau priceAsOfDate diisi, cari
  // harga yang berlaku PADA/SEBELUM tanggal itu (price list berlaku sampai
  // ada upload baru yang menggantikannya), bukan harga terbaru begitu saja.
  const branchDetail = useMemo(() => {
    if (!branch) return null;
    // Harga 0 = rute belum ditawarkan, jangan dianggap harga beneran.
    const rows = trend
      .filter((t) => t.branch === branch && t.price > 0)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (rows.length === 0) {
      return { notFound: true as const, earliestDate: null };
    }

    const eligibleRows = priceAsOfDate ? rows.filter((r) => r.date <= priceAsOfDate) : rows;
    if (eligibleRows.length === 0) {
      return { notFound: true as const, earliestDate: rows[rows.length - 1].date };
    }

    const current = eligibleRows[0];
    const previous = rows[rows.indexOf(current) + 1];
    return {
      notFound: false as const,
      price: current.price,
      date: current.date,
      previousPrice: previous?.price ?? null,
      delta: previous ? current.price - previous.price : null,
    };
  }, [trend, branch, priceAsOfDate]);

  const visibleBranches = useMemo(
    () =>
      branches.filter((d) =>
        d.toLowerCase().includes(branchQuery.trim().toLowerCase())
      ),
    [branches, branchQuery]
  );

  function toggleBranch(d: string) {
    setHiddenBranches((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  const kpis = useMemo(() => {
    const entries = Object.entries(latestPrices);
    if (entries.length === 0) return null;
    const [highestDest, highestPrice] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
    const [lowestDest, lowestPrice] = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
    return {
      highestDest,
      highestPrice,
      lowestDest,
      lowestPrice,
      range: highestPrice - lowestPrice,
    };
  }, [latestPrices]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2 border-b border-secondary/10">
        <div>
          <h1 className="text-[2.6rem] font-display text-primary tracking-[-0.02em] leading-none mb-2">
            {t('pl_dashboard_title')}
          </h1>
          <p className="text-[0.95rem] text-secondary">
            {t('pl_dashboard_subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/pricelist/uploads"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <History size={16} />
            {t('pl_btn_history')}
          </Link>
          <Link
            to="/pricelist/upload"
            className="btn-primary inline-flex items-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99]"
          >
            <Upload size={18} />
            {t('pl_btn_upload')}
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {filterError && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-500/25 bg-rose-500/5 px-4 py-3.5 text-sm text-rose-600">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Gagal memuat data</p>
            <p className="text-rose-500/80">{filterError}</p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4 items-end justify-between sticky top-4 z-20 shadow-lg border-secondary/20 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="flex flex-wrap gap-4 flex-1">
          {optionsLoading ? (
            <>
              <div className="space-y-1.5">
                <div className="h-3 w-12 skeleton rounded" />
                <div className="h-9 w-32 skeleton rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-12 skeleton rounded" />
                <div className="h-9 w-32 skeleton rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-16 skeleton rounded" />
                <div className="h-9 w-40 skeleton rounded-lg" />
              </div>
            </>
          ) : (
            <>
              <SegmentedControl
                label="Tipe Sheet"
                value={sheetType}
                onChange={setSheetType}
                options={options?.sheetTypes ?? []}
              />
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
              <CategoryCombobox
                label="Kategori Barang"
                value={category}
                onChange={setCategory}
                options={options?.categories ?? []}
              />
              <CategoryCombobox
                label="Cabang"
                value={branch}
                onChange={setBranch}
                options={options?.branches ?? []}
                allowClear
                clearLabel="Semua Cabang"
                searchPlaceholder="Cari cabang..."
              />
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-[0.78rem] font-medium text-secondary shrink-0">
          <TrendingUp size={14} className="text-tertiary" />
          <span>
            {branches.length > 0
              ? `${branches.length} cabang • ${chartData.length} titik data`
              : "Pilih filter untuk melihat tren"}
          </span>
        </div>
      </div>

      {/* Harga per Tanggal — muncul begitu cabang spesifik dipilih. Default
          menampilkan harga terbaru, tapi bisa dicek harga yang berlaku pada
          tanggal tertentu di masa lalu lewat input tanggal. */}
      {branch && branchDetail && (
        <div className="card p-5 border border-tertiary/30 bg-tertiary/5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase mb-1">
              Harga {category || "—"} · {mode || "—"} ke {branch}
            </p>
            {branchDetail.notFound ? (
              <>
                <p className="text-[1.1rem] font-semibold text-primary">
                  {branchDetail.earliestDate ? "Belum ada data untuk tanggal ini" : "Rute ini belum tersedia"}
                </p>
                <p className="text-[0.8rem] text-secondary mt-1">
                  {branchDetail.earliestDate ? (
                    <>
                      Data price list untuk kombinasi ini baru tersedia mulai{" "}
                      {new Date(branchDetail.earliestDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      .
                    </>
                  ) : (
                    `${category || "Kategori ini"} belum ditawarkan untuk cabang ${branch} di semua price list yang pernah diupload.`
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="text-[1.8rem] font-display text-primary leading-none">
                  {formatRupiah(branchDetail.price)}
                </p>
                <p className="text-[0.8rem] text-secondary mt-1">
                  Berlaku sejak{" "}
                  {new Date(branchDetail.date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  {priceAsOfDate && " (harga yang berlaku pada tanggal yang dicari)"}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {!branchDetail.notFound && branchDetail.delta !== null && branchDetail.delta !== 0 && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${branchDetail.delta > 0
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-emerald-500/10 text-emerald-600"
                  }`}
              >
                {branchDetail.delta > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {formatRupiah(Math.abs(branchDetail.delta))} dari sebelumnya
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">
                Cek harga per tanggal
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={priceAsOfDate}
                  onChange={(e) => setPriceAsOfDate(e.target.value)}
                  className="form-input py-1.5 px-2.5 text-sm"
                />
                {priceAsOfDate && (
                  <button
                    type="button"
                    onClick={() => setPriceAsOfDate("")}
                    className="text-[0.78rem] font-medium text-tertiary hover:underline shrink-0"
                  >
                    Harga terbaru
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Summary — dibandingkan lintas cabang, jadi disembunyikan kalau
          user sudah mempersempit ke satu cabang spesifik */}
      {kpis && !branch && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 border border-secondary/20">
            <p className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase mb-1">
              Cabang Termahal
            </p>
            <div className="flex items-baseline gap-2">
              <TrendingUp size={16} className="text-rose-500 shrink-0" />
              <span className="text-[1.15rem] font-semibold text-primary">{kpis.highestDest}</span>
              <span className="text-[0.85rem] text-secondary">{formatRupiah(kpis.highestPrice)}</span>
            </div>
          </div>
          <div className="card p-4 border border-secondary/20">
            <p className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase mb-1">
              Cabang Termurah
            </p>
            <div className="flex items-baseline gap-2">
              <TrendingDown size={16} className="text-emerald-500 shrink-0" />
              <span className="text-[1.15rem] font-semibold text-primary">{kpis.lowestDest}</span>
              <span className="text-[0.85rem] text-secondary">{formatRupiah(kpis.lowestPrice)}</span>
            </div>
          </div>
          <div className="card p-4 border border-secondary/20">
            <p className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase mb-1">
              Rentang Harga
            </p>
            <span className="text-[1.15rem] font-semibold text-primary">{formatRupiah(kpis.range)}</span>
          </div>
        </div>
      )}

      {/* Chart Card */}
      <div className="card bg-surface shadow-md border border-secondary/20 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-secondary/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-tertiary/10">
              <BarChart3 size={18} className="text-tertiary" />
            </div>
            <div>
              <h2 className="text-[1rem] font-semibold text-primary">Tren Harga</h2>
              <p className="text-[0.78rem] text-secondary">
                {sheetType || "—"} · {mode || "—"} · {category || "—"}
              </p>
            </div>
          </div>
          {chartData.length > 0 && !loading && (
            <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral border border-secondary/15 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("chart")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[0.78rem] font-medium transition-colors ${viewMode === "chart" ? "bg-surface shadow-sm text-primary" : "text-secondary"
                  }`}
              >
                <LineChartIcon size={14} />
                Grafik
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[0.78rem] font-medium transition-colors ${viewMode === "table" ? "bg-surface shadow-sm text-primary" : "text-secondary"
                  }`}
              >
                <TableIcon size={14} />
                Tabel
              </button>
            </div>
          )}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-2 w-48 skeleton rounded-full animate-pulse" />
              <div className="h-2 w-32 skeleton rounded-full animate-pulse" />
              <p className="text-sm text-secondary mt-2">Memuat data tren harga...</p>
            </div>
          ) : !sheetType && !mode && !category ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-neutral rounded-full flex items-center justify-center mb-4 border border-secondary/20">
                <BarChart3 className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-base font-semibold text-primary mb-1">Pilih filter untuk memulai</h3>
              <p className="text-secondary text-sm text-center max-w-xs">
                Pilih Tipe Sheet, Mode, dan Kategori Barang di atas untuk menampilkan grafik tren harga.
              </p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-neutral rounded-full flex items-center justify-center mb-4 border border-secondary/20">
                <TrendingUp className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-base font-semibold text-primary mb-1">Belum ada data</h3>
              <p className="text-secondary text-sm text-center max-w-xs mb-5">
                Tidak ada data harga untuk kombinasi filter ini. Coba ubah filter atau upload price list baru.
              </p>
              <Link to="/pricelist/upload" className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2">
                <Upload size={15} />
                Upload Price List
              </Link>
            </div>
          ) : (
            <>
              {/* Kontrol cabang: cari, sembunyikan/tampilkan, soroti saat hover.
                  Penting waktu cabang banyak — tanpa ini grafik jadi "mi instan"
                  penuh garis warna-warni yang saling tumpang tindih.
                  Disembunyikan kalau filter Cabang di atas sudah dipilih
                  spesifik, karena saat itu cuma tersisa 1 garis — tidak ada
                  lagi yang perlu dicari atau disembunyikan. */}
              {!branch && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                  <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary" />
                    <input
                      type="text"
                      value={branchQuery}
                      onChange={(e) => setBranchQuery(e.target.value)}
                      placeholder="Cari cabang..."
                      className="form-input py-1.5 pl-8 pr-7 text-sm w-full"
                    />
                    {branchQuery && (
                      <button
                        type="button"
                        onClick={() => setBranchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {hiddenBranches.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setHiddenBranches(new Set())}
                      className="text-[0.78rem] font-medium text-tertiary hover:underline shrink-0"
                    >
                      Tampilkan semua ({hiddenBranches.size} disembunyikan)
                    </button>
                  )}
                </div>
              )}

              {/* Legenda interaktif — klik untuk sembunyikan/tampilkan cabang,
                  arahkan kursor untuk menyorot satu garis. Diurutkan dari
                  harga terbaru tertinggi supaya langsung ketahuan urutannya.
                  Sama seperti di atas, disembunyikan kalau cabang sudah
                  dipersempit ke satu (kartu Harga per Tanggal sudah cukup). */}
              {!branch && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {visibleBranches.map((d) => {
                    const i = branches.indexOf(d);
                    const color = LINE_COLORS[i % LINE_COLORS.length];
                    const isHidden = hiddenBranches.has(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleBranch(d)}
                        onMouseEnter={() => setActiveBranch(d)}
                        onMouseLeave={() => setActiveBranch(null)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[0.78rem] font-medium transition-opacity ${isHidden
                            ? "border-secondary/20 text-secondary/50 opacity-60"
                            : "border-secondary/20 text-primary"
                          }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: isHidden ? "var(--color-secondary, #94a3b8)" : color }}
                        />
                        {d}
                        {latestPrices[d] != null && (
                          <span className="text-secondary">{formatRupiah(latestPrices[d])}</span>
                        )}
                      </button>
                    );
                  })}
                  {visibleBranches.length === 0 && (
                    <p className="text-sm text-secondary py-1">Tidak ada cabang yang cocok dengan pencarian.</p>
                  )}
                </div>
              )}

              {viewMode === "chart" ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary, #94a3b8)" strokeOpacity={0.15} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: "var(--color-secondary, #64748b)" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--color-secondary, #94a3b8)", strokeOpacity: 0.2 }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      label={{ value: "Tanggal Berlaku", position: "insideBottom", offset: -4, fontSize: 11, fill: "var(--color-secondary, #64748b)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "var(--color-secondary, #64748b)" }}
                      tickLine={false}
                      axisLine={false}
                      domain={yDomain as any}
                      tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid rgba(0,0,0,0.08)",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                        fontSize: "0.85rem",
                      }}
                      formatter={(v: any, name: any) => [formatRupiah(v as number), name]}
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                      }
                      labelStyle={{ fontWeight: 600, marginBottom: "4px" }}
                      itemSorter={(item) => -(item.value as number)}
                    />
                    {branches
                      .filter((d) => !hiddenBranches.has(d))
                      .map((d) => {
                        const i = branches.indexOf(d);
                        const isDimmed = activeBranch !== null && activeBranch !== d;
                        return (
                          <Line
                            key={d}
                            type="monotone"
                            dataKey={d}
                            name={d}
                            stroke={LINE_COLORS[i % LINE_COLORS.length]}
                            strokeWidth={activeBranch === d ? 3.5 : 2.5}
                            strokeOpacity={isDimmed ? 0.2 : 1}
                            dot={{ r: 4, strokeWidth: 2, fill: "var(--color-surface, #fff)" }}
                            activeDot={{ r: 6 }}
                            connectNulls
                            isAnimationActive={false}
                          />
                        );
                      })}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-secondary/15">
                        <th className="text-left py-2 pr-4 font-semibold text-secondary text-[0.78rem] uppercase tracking-[0.04em] sticky left-0 bg-surface">
                          Tanggal Berlaku
                        </th>
                        {visibleBranches
                          .filter((d) => !hiddenBranches.has(d))
                          .map((d) => (
                            <th key={d} className="text-right py-2 px-4 font-semibold text-primary whitespace-nowrap">
                              {d}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((row) => (
                        <tr key={String(row.date)} className="border-b border-secondary/10">
                          <td className="py-2 pr-4 text-secondary whitespace-nowrap sticky left-0 bg-surface">
                            {new Date(String(row.date)).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          {visibleBranches
                            .filter((d) => !hiddenBranches.has(d))
                            .map((d) => (
                              <td key={d} className="text-right py-2 px-4 text-primary whitespace-nowrap">
                                {row[d] != null ? formatRupiah(Number(row[d])) : "—"}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SegmentedControl({
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

function CategoryCombobox({
  label,
  value,
  onChange,
  options,
  allowClear = false,
  clearLabel = "Semua",
  searchPlaceholder = "Cari kategori...",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allowClear?: boolean;
  clearLabel?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.trim().toLowerCase())
  );

  const displayValue = value || (allowClear ? clearLabel : "");

  return (
    <div className="flex flex-col gap-1.5 relative" ref={containerRef}>
      <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">
        {label}
      </label>
      <div className="relative min-w-[220px]">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
        <input
          type="text"
          value={open ? query : displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          placeholder={displayValue || searchPlaceholder}
          disabled={options.length === 0}
          className="form-input py-2 pl-8 pr-8 text-sm w-full"
        />
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
        {open && options.length > 0 && (
          <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-secondary/20 bg-surface shadow-lg py-1">
            {allowClear && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-left italic text-secondary hover:bg-neutral"
              >
                {clearLabel}
                {value === "" && <Check size={14} className="text-tertiary shrink-0" />}
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-secondary">Tidak ditemukan.</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    onChange(o);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-neutral"
                >
                  {o}
                  {o === value && <Check size={14} className="text-tertiary shrink-0" />}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
