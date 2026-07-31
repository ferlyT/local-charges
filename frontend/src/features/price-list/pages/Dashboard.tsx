import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../../../hooks/useTranslation";
import { AlertCircle, TrendingUp, TrendingDown, BarChart3, ArrowUpRight, ArrowDownRight, Minus, Sparkles, History as HistoryIcon, Upload as UploadIcon } from "lucide-react";
import { usePriceListFilters } from "../hooks/usePriceListFilters";
import { usePriceListTrend } from "../hooks/usePriceListTrend";
import { useLatestPriceDiff } from "../hooks/useLatestPriceDiff";
import { DashboardFilters } from "../components/DashboardFilters";
import { PriceTrendChart } from "../components/PriceTrendChart";
import { formatRupiah } from "../../../lib/utils";
import FadeIn from "../../../components/ui/FadeIn";

// Ringkas daftar kategori terpilih supaya subtitle/label tidak kepanjangan
// di layar sempit. 1 kategori tampil apa adanya, 2+ diringkas jadi "N kategori"
// (daftar lengkapnya tetap ada lewat atribut title untuk hover di desktop).
function formatCategoryLabel(categories: string[], emptyLabel: string) {
  if (categories.length === 0) return emptyLabel;
  if (categories.length === 1) return categories[0];
  return `${categories.length} kategori`;
}

// Beda dari formatCategoryLabel: opsi Tipe Sheet cuma sedikit (CS/MKT), jadi
// lebih enak ditampilkan lengkap ("CS + MKT") daripada diringkas jadi angka.
function formatSheetTypeLabel(sheetTypes: string[], emptyLabel: string) {
  if (sheetTypes.length === 0) return emptyLabel;
  return sheetTypes.join(" + ");
}

function formatTanggal(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

type PriceChangeItem = {
  sheetType: string;
  mode: string;
  branch: string;
  category: string;
  previousPrice: number | null;
  currentPrice: number;
  deltaPct: number | null;
};

// Kartu daftar "Harga Naik" / "Harga Turun". Di layar sempit, info
// Tipe/Mode/Kategori dipindah dari satu baris yang di-truncate menjadi
// badge yang boleh wrap, supaya tetap terbaca tanpa terpotong.
function PriceChangeCard({
  title,
  icon,
  iconBg,
  emptyText,
  items,
  variant,
}: {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  emptyText: string;
  items: PriceChangeItem[];
  variant: "naik" | "turun";
}) {
  const isNaik = variant === "naik";
  const chipBg = isNaik ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600";
  const TrendIcon = isNaik ? TrendingUp : TrendingDown;
  const sign = isNaik ? "+" : "";

  return (
    <div className="card p-4 sm:p-5 border border-secondary/15 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">{title}</p>
        <div className={`p-1.5 rounded-lg ${iconBg}`}>{icon}</div>
      </div>
      {items.length === 0 ? (
        <p className="text-[0.85rem] text-secondary">{emptyText}</p>
      ) : (
        <ul className="space-y-3 sm:space-y-2.5">
          {items.slice(0, 5).map((d, i) => (
            <li
              key={`${d.sheetType}-${d.mode}-${d.branch}-${d.category}-${i}`}
              className="flex items-start sm:items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-[0.9rem] font-semibold text-primary sm:truncate">
                  {d.branch}
                  <span className="hidden sm:inline text-secondary font-normal"> · {d.sheetType} · {d.mode} · {d.category}</span>
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5 sm:hidden">
                  <span className="inline-flex px-1.5 py-0.5 rounded-md bg-neutral text-[0.68rem] font-medium text-secondary">
                    {d.sheetType}
                  </span>
                  <span className="inline-flex px-1.5 py-0.5 rounded-md bg-neutral text-[0.68rem] font-medium text-secondary">
                    {d.mode}
                  </span>
                  <span className="inline-flex px-1.5 py-0.5 rounded-md bg-neutral text-[0.68rem] font-medium text-secondary">
                    {d.category}
                  </span>
                </div>
                <p className="text-[0.75rem] text-secondary mt-1">
                  {d.previousPrice !== null ? formatRupiah(d.previousPrice) : "—"} → {formatRupiah(d.currentPrice)}
                </p>
              </div>
              <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.78rem] font-medium ${chipBg}`}>
                <TrendIcon size={12} />
                {sign}
                {(d.deltaPct ?? 0).toFixed(1)}%
              </span>
            </li>
          ))}
          {items.length > 5 && (
            <li className="text-[0.75rem] text-secondary pt-1">+{items.length - 5} baris lainnya {variant}</li>
          )}
        </ul>
      )}
    </div>
  );
}

export function Dashboard() {
  const { t } = useTranslation();

  const {
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
  } = usePriceListFilters();

  const {
    trend,
    loading,
    isRefetching,
    error: trendError,
    chartData,
    series,
    yDomain,
    latestPrices,
    seriesTrend,
    maxPrice
  } = usePriceListTrend(sheetTypes, mode, categories, branch);

  // Perubahan harga (naik/turun/tetap/baru) dari upload AKTIF TERBARU.
  // Sengaja tidak dipengaruhi filter sheetType/mode/category/branch di atas,
  // supaya begitu Dashboard dibuka langsung kelihatan semua perubahan dari
  // upload terbaru, sama seperti yang tampil di halaman Detail Upload.
  const {
    loading: diffLoading,
    error: diffError,
    currentEffectiveDate,
    previousEffectiveDate,
    naik,
    turun,
    tetapCount,
    baruCount,
  } = useLatestPriceDiff();

  const [priceAsOfDate, setPriceAsOfDate] = useState("");

  // Di mobile, "Tren Harga" (grafik) dan "Perubahan Harga" (naik/turun/tetap/baru)
  // ditampilkan sebagai tab terpisah supaya user tidak perlu scroll panjang untuk
  // sampai ke grafik. Di layar sm+ ke atas, keduanya tetap tampil sekaligus seperti semula.
  const [activeMobileTab, setActiveMobileTab] = useState<"chart" | "changes">("chart");
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  function handleSwipeStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleSwipeEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    // Abaikan swipe yang sebenarnya scroll vertikal atau terlalu pendek.
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && activeMobileTab === "chart") setActiveMobileTab("changes");
    if (dx > 0 && activeMobileTab === "changes") setActiveMobileTab("chart");
  }

  // Kartu "Harga ke [Cabang]" sekarang breakdown per KATEGORI (baris) x TIPE
  // SHEET (chip di dalam baris) — bukan 1 angka tunggal — karena kategori &
  // tipe sheet dua-duanya sudah multi-select, jadi "harga"-nya memang bisa
  // lebih dari satu nilai sekaligus untuk cabang yang sama.
  const branchPriceBreakdown = useMemo(() => {
    if (!branch) return null;
    const byKey = new Map<string, typeof trend>();
    for (const t of trend) {
      if (t.branch !== branch || t.price <= 0) continue;
      const key = `${t.category}||${t.sheetType}`;
      const arr = byKey.get(key) ?? [];
      arr.push(t);
      byKey.set(key, arr);
    }
    if (byKey.size === 0) {
      return { rows: [] as { category: string; cells: { sheetType: string; price: number; date: string; delta: number | null }[] }[], notFound: true as const };
    }

    const rowsMap = new Map<string, { sheetType: string; price: number; date: string; delta: number | null }[]>();
    for (const [key, arr] of byKey) {
      const [category, sheetType] = key.split("||");
      const sorted = [...arr].sort((a, b) => b.date.localeCompare(a.date));
      const eligible = priceAsOfDate ? sorted.filter((r) => r.date <= priceAsOfDate) : sorted;
      if (eligible.length === 0) continue;
      const current = eligible[0];
      const previous = sorted[sorted.indexOf(current) + 1];
      const cell = {
        sheetType,
        price: current.price,
        date: current.date,
        delta: previous ? current.price - previous.price : null,
      };
      const list = rowsMap.get(category) ?? [];
      list.push(cell);
      rowsMap.set(category, list);
    }

    const rows = Array.from(rowsMap.entries()).map(([category, cells]) => ({
      category,
      cells: cells.sort((a, b) => a.sheetType.localeCompare(b.sheetType)),
    }));
    const asOfDate = rows
      .flatMap((r) => r.cells.map((c) => c.date))
      .reduce((latest, d) => (!latest || d > latest ? d : latest), "" as string) || null;
    return { rows, notFound: rows.length === 0, asOfDate };
  }, [trend, branch, priceAsOfDate]);

  // Dipecah per SHEET TYPE (bukan 1 angka gabungan) — soalnya kalau CS & MKT
  // dua-duanya aktif, "harga tertinggi/terendah" gabungan cuma bakal nunjukin
  // salah satu sheet aja (yang kebetulan lebih ekstrem), nyembunyiin yang satu
  // lagi. Jadi tiap kartu sekarang nampilin satu baris per sheet yang aktif.
  const periodStatsBySheet = useMemo(() => {
    const map = new Map<string, { highest: { date: string; price: number } | null; lowest: { date: string; price: number } | null }>();
    let globalHighest: number | null = null;
    let globalLowest: number | null = null;
    for (const t of trend) {
      if (t.price <= 0) continue;
      let entry = map.get(t.sheetType);
      if (!entry) {
        entry = { highest: null, lowest: null };
        map.set(t.sheetType, entry);
      }
      if (!entry.highest || t.price > entry.highest.price) entry.highest = { date: t.date, price: t.price };
      if (!entry.lowest || t.price < entry.lowest.price) entry.lowest = { date: t.date, price: t.price };
      if (globalHighest === null || t.price > globalHighest) globalHighest = t.price;
      if (globalLowest === null || t.price < globalLowest) globalLowest = t.price;
    }
    if (map.size === 0 || globalHighest === null || globalLowest === null) return null;
    return {
      bySheet: Array.from(map.entries()).map(([sheetType, v]) => ({
        sheetType,
        highest: v.highest as { date: string; price: number },
        lowest: v.lowest as { date: string; price: number },
      })),
      range: globalHighest - globalLowest,
    };
  }, [trend]);

  const combinedError = filterError || trendError;

  const hasChanges =
    !diffLoading && !!currentEffectiveDate && (naik.length > 0 || turun.length > 0 || tetapCount > 0 || baruCount > 0);
  const categoryLabelFull = categories.join(", ");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto flex flex-col gap-6 sm:gap-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 pb-2 border-b border-secondary/10">
        <div>
          <h1 className="text-[1.75rem] sm:text-[2.1rem] lg:text-[2.6rem] font-display text-primary tracking-[-0.02em] leading-tight sm:leading-none mb-1.5 sm:mb-2">
            {t('pl_dashboard_title')}
          </h1>
          <p className="text-[0.85rem] sm:text-[0.95rem] text-secondary">
            {t('pl_dashboard_subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 shrink-0">
          <Link
            to="/pricelist/uploads"
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <HistoryIcon size={16} />
            {t('pl_btn_history')}
          </Link>
          <Link
            to="/pricelist/upload"
            className="btn-primary inline-flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99]"
          >
            <UploadIcon size={18} />
            {t('pl_btn_upload')}
          </Link>
        </div>
      </div>

      {/* 2. Error Banner */}
      <FadeIn show={!!(combinedError || diffError)}>
        <div className="flex items-start gap-3 rounded-lg border border-rose-500/25 bg-rose-500/5 px-4 py-3.5 text-sm text-rose-600">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Gagal memuat data</p>
            <p className="text-rose-500/80">{combinedError || diffError}</p>
          </div>
        </div>
      </FadeIn>

      {/* 3. Filter Bar — sticky di bawah scroll. Catatan: position:sticky akan berhenti
          bekerja kalau ada ancestor (di luar file ini, misal wrapper transisi halaman)
          yang punya transform/filter/contain/overflow selain visible — itu membuat
          "containing block" baru dan sticky jadi diam di tempat alih-alih menempel.
          Kalau setelah perubahan ini masih belum menempel, cek wrapper layout global. */}
      <DashboardFilters
        options={options}
        optionsLoading={optionsLoading}
        sheetTypes={sheetTypes}
        setSheetTypes={setSheetTypes}
        mode={mode}
        setMode={setMode}
        categories={categories}
        setCategories={setCategories}
        branch={branch}
        setBranch={setBranch}
        categoryOptions={categoryOptions}
        categoriesLoading={categoriesLoading}
      />

      {/* 4. Tab switcher — hanya di mobile, supaya user tidak perlu scroll panjang
          untuk sampai ke grafik ATAU ke ringkasan perubahan harga. */}
      {hasChanges && (
        <div className="sm:hidden -mt-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral border border-secondary/15">
            <button
              type="button"
              onClick={() => setActiveMobileTab("chart")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[0.8rem] font-medium transition-all ${activeMobileTab === "chart" ? "bg-surface shadow-sm text-primary" : "text-secondary"
                }`}
            >
              <BarChart3 size={14} />
              Tren Harga
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab("changes")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[0.8rem] font-medium transition-all ${activeMobileTab === "changes" ? "bg-surface shadow-sm text-primary" : "text-secondary"
                }`}
            >
              <ArrowUpRight size={14} />
              Perubahan Harga{naik.length + turun.length > 0 ? ` (${naik.length + turun.length})` : ""}
            </button>
          </div>
        </div>
      )}

      {/* 5. Ringkasan (KPI atau detail cabang) + Grafik — blok utama/paling penting,
          jadi ditaruh tepat di bawah filter. Di mobile ini tab "Tren Harga". */}
      <div
        className={`flex flex-col gap-6 sm:gap-8 ${activeMobileTab === "chart" ? "flex" : "hidden"} sm:flex`}
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
      >
        {/* Detail Cabang — muncul kalau ada filter cabang aktif, menggantikan KPI periode */}
        <FadeIn show={!!(branch && branchPriceBreakdown)}>
          {branch && branchPriceBreakdown && (
            <div className="card p-4 sm:p-5 rounded-xl border border-tertiary/30 bg-tertiary/5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase mb-2" title={categoryLabelFull}>
                  Harga {formatCategoryLabel(categories, "—")} · {formatSheetTypeLabel(sheetTypes, "—")} · {mode || "—"} ke {branch}
                </p>
                {branchPriceBreakdown.notFound ? (
                  <>
                    <p className="text-[1.1rem] font-semibold text-primary">
                      {priceAsOfDate ? "Belum ada data untuk tanggal ini" : "Rute ini belum tersedia"}
                    </p>
                    <p className="text-[0.8rem] text-secondary mt-1">
                      {`${formatCategoryLabel(categories, "Kategori ini")} belum ditawarkan untuk cabang ${branch} pada filter yang sedang aktif.`}
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {branchPriceBreakdown.rows.map((row) => (
                      <div key={row.category} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                        <span
                          className="text-[0.82rem] font-semibold text-primary sm:w-40 shrink-0 truncate"
                          title={row.category}
                        >
                          {row.category}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {row.cells.map((cell) => (
                            <div
                              key={cell.sheetType}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral/60"
                            >
                              <span className="text-[0.68rem] font-semibold text-secondary uppercase">
                                {cell.sheetType}
                              </span>
                              <span className="text-[0.85rem] font-semibold text-primary">
                                {formatRupiah(cell.price)}
                              </span>
                              {cell.delta !== null && cell.delta !== 0 && (
                                <span
                                  className={`flex items-center gap-0.5 text-[0.72rem] font-medium ${cell.delta > 0 ? "text-rose-600" : "text-emerald-600"
                                    }`}
                                >
                                  {cell.delta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                  {formatRupiah(Math.abs(cell.delta))}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {branchPriceBreakdown.asOfDate && (
                      <p className="text-[0.78rem] text-secondary mt-0.5">
                        Berlaku sejak {formatTanggal(branchPriceBreakdown.asOfDate)}
                        {priceAsOfDate && " (harga yang berlaku pada tanggal yang dicari)"}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 w-full sm:w-auto shrink-0">
                <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">
                  Cek harga per tanggal
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={priceAsOfDate}
                    onChange={(e) => setPriceAsOfDate(e.target.value)}
                    className="form-input py-1.5 px-2.5 text-sm w-full sm:w-auto"
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
          )}
        </FadeIn>

        {/* KPI Summary (per periode, dipecah per sheet CS/MKT) — muncul kalau tidak ada filter cabang aktif */}
        <FadeIn show={!!(periodStatsBySheet && !branch)}>
          {periodStatsBySheet && !branch && (
            <>
              {/* Versi ringkas untuk mobile — 3 kartu sejajar, tanpa progress bar & subtitle panjang */}
              <div className="grid grid-cols-3 gap-2 sm:hidden">
                <div className="card p-3 border border-secondary/15 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="p-1 rounded-md bg-rose-500/10 shrink-0">
                      <TrendingUp size={12} className="text-rose-500" />
                    </div>
                    <p className="text-[0.62rem] font-semibold text-secondary uppercase tracking-[0.02em]">Termahal</p>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {periodStatsBySheet.bySheet.map((s) => (
                      <div key={s.sheetType} className="flex items-baseline justify-between gap-1">
                        <span className="text-[0.6rem] font-semibold text-secondary uppercase shrink-0">{s.sheetType}</span>
                        <span className="text-[0.78rem] font-display text-primary leading-tight truncate">
                          {formatRupiah(s.highest.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card p-3 border border-secondary/15 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="p-1 rounded-md bg-emerald-500/10 shrink-0">
                      <TrendingDown size={12} className="text-emerald-500" />
                    </div>
                    <p className="text-[0.62rem] font-semibold text-secondary uppercase tracking-[0.02em]">Termurah</p>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {periodStatsBySheet.bySheet.map((s) => (
                      <div key={s.sheetType} className="flex items-baseline justify-between gap-1">
                        <span className="text-[0.6rem] font-semibold text-secondary uppercase shrink-0">{s.sheetType}</span>
                        <span className="text-[0.78rem] font-display text-primary leading-tight truncate">
                          {formatRupiah(s.lowest.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card p-3 border border-secondary/15 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="p-1 rounded-md bg-tertiary/10 shrink-0">
                      <BarChart3 size={12} className="text-tertiary" />
                    </div>
                    <p className="text-[0.62rem] font-semibold text-secondary uppercase tracking-[0.02em]">Rentang</p>
                  </div>
                  <p className="text-[0.8rem] font-display text-primary leading-tight mt-0.5">
                    {formatRupiah(periodStatsBySheet.range)}
                  </p>
                </div>
              </div>

              {/* Versi lengkap untuk sm+ — tiap kartu breakdown per sheet (CS/MKT) */}
              <div className="hidden sm:grid sm:grid-cols-3 gap-4">
                <div className="card p-4 sm:p-5 border border-secondary/15 rounded-xl transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between mb-3">
                    <p
                      className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase"
                      title={categoryLabelFull}
                    >
                      Periode Termahal · {mode || "Semua Mode"} · {formatCategoryLabel(categories, "Semua Kategori")}
                    </p>
                    <div className="p-1.5 rounded-lg bg-rose-500/10 shrink-0">
                      <TrendingUp size={15} className="text-rose-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {periodStatsBySheet.bySheet.map((s) => (
                      <div key={s.sheetType} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[0.68rem] font-semibold text-secondary uppercase px-1.5 py-0.5 rounded bg-neutral shrink-0">
                            {s.sheetType}
                          </span>
                          <span className="text-[0.78rem] text-secondary truncate">{formatTanggal(s.highest.date)}</span>
                        </div>
                        <span className="text-[1.05rem] font-semibold text-primary shrink-0">{formatRupiah(s.highest.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card p-4 sm:p-5 border border-secondary/15 rounded-xl transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between mb-3">
                    <p
                      className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase"
                      title={categoryLabelFull}
                    >
                      Periode Termurah · {mode || "Semua Mode"} · {formatCategoryLabel(categories, "Semua Kategori")}
                    </p>
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 shrink-0">
                      <TrendingDown size={15} className="text-emerald-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {periodStatsBySheet.bySheet.map((s) => (
                      <div key={s.sheetType} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[0.68rem] font-semibold text-secondary uppercase px-1.5 py-0.5 rounded bg-neutral shrink-0">
                            {s.sheetType}
                          </span>
                          <span className="text-[0.78rem] text-secondary truncate">{formatTanggal(s.lowest.date)}</span>
                        </div>
                        <span className="text-[1.05rem] font-semibold text-primary shrink-0">{formatRupiah(s.lowest.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card p-4 sm:p-5 border border-secondary/15 rounded-xl transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">
                      Rentang Harga
                    </p>
                    <div className="p-1.5 rounded-lg bg-tertiary/10">
                      <BarChart3 size={15} className="text-tertiary" />
                    </div>
                  </div>
                  <p className="text-[1.4rem] font-display text-primary leading-none mb-2">{formatRupiah(periodStatsBySheet.range)}</p>
                  <p className="text-[0.78rem] text-secondary">
                    Selisih antara harga terendah &amp; tertinggi yang tercatat saat ini (lintas semua sheet)
                  </p>
                </div>
              </div>
            </>
          )}
        </FadeIn>

        {/* Grafik */}
        <PriceTrendChart
          chartData={chartData}
          series={series}
          yDomain={yDomain}
          latestPrices={latestPrices}
          seriesTrend={seriesTrend}
          maxPrice={maxPrice}
          loading={loading}
          isRefetching={isRefetching}
          sheetTypes={sheetTypes}
          mode={mode}
          categories={categories}
          branch={branch}
        />
      </div>

      {/* 6. Ringkasan Perubahan Harga — upload aktif terbaru, lintas semua tipe/mode/kategori.
          Info sekunder, ditaruh paling bawah. Di mobile ini tab "Perubahan Harga". */}
      {hasChanges && (
        <div
          className={`space-y-4 ${activeMobileTab === "changes" ? "block" : "hidden"} sm:block`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[0.8rem] text-secondary">
              Perubahan harga berlaku mulai <span className="font-semibold text-primary">{formatTanggal(currentEffectiveDate)}</span>
              {previousEffectiveDate && (
                <> — dibandingkan dengan upload berlaku {formatTanggal(previousEffectiveDate)}</>
              )}
            </p>
          </div>

          {/* Strip ringkasan angka */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-4 rounded-xl border-2 border-rose-500/30 bg-rose-500/5 flex items-center gap-3">
              <TrendingUp size={20} className="text-rose-500 shrink-0" />
              <div>
                <p className="text-[1.4rem] font-display text-primary leading-none">{naik.length}</p>
                <p className="text-[0.7rem] tracking-[0.06em] font-semibold text-secondary uppercase mt-1">Naik</p>
              </div>
            </div>
            <div className="card p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 flex items-center gap-3">
              <TrendingDown size={20} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-[1.4rem] font-display text-primary leading-none">{turun.length}</p>
                <p className="text-[0.7rem] tracking-[0.06em] font-semibold text-secondary uppercase mt-1">Turun</p>
              </div>
            </div>
            <div className="card p-4 rounded-xl border border-secondary/15 flex items-center gap-3">
              <Minus size={20} className="text-secondary shrink-0" />
              <div>
                <p className="text-[1.4rem] font-display text-primary leading-none">{tetapCount}</p>
                <p className="text-[0.7rem] tracking-[0.06em] font-semibold text-secondary uppercase mt-1">Tetap</p>
              </div>
            </div>
            <div className="card p-4 rounded-xl border border-secondary/15 flex items-center gap-3">
              <Sparkles size={20} className="text-tertiary shrink-0" />
              <div>
                <p className="text-[1.4rem] font-display text-primary leading-none">{baruCount}</p>
                <p className="text-[0.7rem] tracking-[0.06em] font-semibold text-secondary uppercase mt-1">Baru</p>
              </div>
            </div>
          </div>

          {/* Daftar naik/turun */}
          {(naik.length > 0 || turun.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PriceChangeCard
                title="Harga Naik"
                icon={<ArrowUpRight size={15} className="text-rose-500" />}
                iconBg="bg-rose-500/10"
                emptyText="Tidak ada kenaikan harga di upload terbaru."
                items={naik}
                variant="naik"
              />
              <PriceChangeCard
                title="Harga Turun"
                icon={<ArrowDownRight size={15} className="text-emerald-500" />}
                iconBg="bg-emerald-500/10"
                emptyText="Tidak ada penurunan harga di upload terbaru."
                items={turun}
                variant="turun"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
