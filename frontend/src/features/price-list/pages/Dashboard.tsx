import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../../../hooks/useTranslation";
import { History, Upload, AlertCircle, TrendingUp, TrendingDown, BarChart3, ArrowUpRight, ArrowDownRight, Minus, Sparkles } from "lucide-react";
import { usePriceListFilters } from "../hooks/usePriceListFilters";
import { usePriceListTrend } from "../hooks/usePriceListTrend";
import { useLatestPriceDiff } from "../hooks/useLatestPriceDiff";
import { DashboardFilters } from "../components/DashboardFilters";
import { PriceTrendChart } from "../components/PriceTrendChart";

function formatRupiah(v: number) {
  return `Rp ${v.toLocaleString("id-ID")}`;
}

// Fade + slide-up kecil untuk blok yang muncul/hilang mengikuti filter
// (kartu harga per cabang, ringkasan KPI, banner error), supaya tidak "loncat".
function FadeIn({ show, children, className = "" }: { show: boolean; children: React.ReactNode; className?: string }) {
  const [mounted, setMounted] = useState(show);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(t);
  }, [show]);

  if (!mounted) return null;
  return (
    <div className={`transition-all duration-300 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"} ${className}`}>
      {children}
    </div>
  );
}

function formatTanggal(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function Dashboard() {
  const { t } = useTranslation();
  
  const {
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
  } = usePriceListFilters();

  const {
    trend,
    loading,
    isRefetching,
    error: trendError,
    chartData,
    branches,
    yDomain,
    latestPrices,
    branchTrend,
    maxPrice
  } = usePriceListTrend(sheetType, mode, category, branch);

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

  const branchDetail = useMemo(() => {
    if (!branch) return null;
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

  const combinedError = filterError || trendError;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
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
            <History size={16} />
            {t('pl_btn_history')}
          </Link>
          <Link
            to="/pricelist/upload"
            className="btn-primary inline-flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99]"
          >
            <Upload size={18} />
            {t('pl_btn_upload')}
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      <FadeIn show={!!(combinedError || diffError)}>
        <div className="flex items-start gap-3 rounded-lg border border-rose-500/25 bg-rose-500/5 px-4 py-3.5 text-sm text-rose-600">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Gagal memuat data</p>
            <p className="text-rose-500/80">{combinedError || diffError}</p>
          </div>
        </div>
      </FadeIn>

      {/* Ringkasan Perubahan Harga — upload aktif terbaru, lintas semua tipe/mode/kategori */}
      {!diffLoading && currentEffectiveDate && (naik.length > 0 || turun.length > 0 || tetapCount > 0 || baruCount > 0) && (
        <div className="space-y-4">
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
              {/* Harga Naik */}
              <div className="card p-4 sm:p-5 border border-secondary/15 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">
                    Harga Naik
                  </p>
                  <div className="p-1.5 rounded-lg bg-rose-500/10">
                    <ArrowUpRight size={15} className="text-rose-500" />
                  </div>
                </div>
                {naik.length === 0 ? (
                  <p className="text-[0.85rem] text-secondary">Tidak ada kenaikan harga di upload terbaru.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {naik.slice(0, 5).map((d, i) => (
                      <li key={`${d.sheetType}-${d.mode}-${d.branch}-${d.category}-${i}`} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[0.9rem] font-semibold text-primary truncate">
                            {d.branch} <span className="text-secondary font-normal">· {d.sheetType} · {d.mode} · {d.category}</span>
                          </p>
                          <p className="text-[0.75rem] text-secondary">
                            {d.previousPrice !== null ? formatRupiah(d.previousPrice) : "—"} → {formatRupiah(d.currentPrice)}
                          </p>
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.78rem] font-medium bg-rose-500/10 text-rose-600">
                          <TrendingUp size={12} />
                          +{(d.deltaPct ?? 0).toFixed(1)}%
                        </span>
                      </li>
                    ))}
                    {naik.length > 5 && (
                      <li className="text-[0.75rem] text-secondary pt-1">+{naik.length - 5} baris lainnya naik</li>
                    )}
                  </ul>
                )}
              </div>

              {/* Harga Turun */}
              <div className="card p-4 sm:p-5 border border-secondary/15 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">
                    Harga Turun
                  </p>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10">
                    <ArrowDownRight size={15} className="text-emerald-500" />
                  </div>
                </div>
                {turun.length === 0 ? (
                  <p className="text-[0.85rem] text-secondary">Tidak ada penurunan harga di upload terbaru.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {turun.slice(0, 5).map((d, i) => (
                      <li key={`${d.sheetType}-${d.mode}-${d.branch}-${d.category}-${i}`} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[0.9rem] font-semibold text-primary truncate">
                            {d.branch} <span className="text-secondary font-normal">· {d.sheetType} · {d.mode} · {d.category}</span>
                          </p>
                          <p className="text-[0.75rem] text-secondary">
                            {d.previousPrice !== null ? formatRupiah(d.previousPrice) : "—"} → {formatRupiah(d.currentPrice)}
                          </p>
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.78rem] font-medium bg-emerald-500/10 text-emerald-600">
                          <TrendingDown size={12} />
                          {(d.deltaPct ?? 0).toFixed(1)}%
                        </span>
                      </li>
                    ))}
                    {turun.length > 5 && (
                      <li className="text-[0.75rem] text-secondary pt-1">+{turun.length - 5} baris lainnya turun</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <DashboardFilters
        options={options}
        optionsLoading={optionsLoading}
        sheetType={sheetType}
        setSheetType={setSheetType}
        mode={mode}
        setMode={setMode}
        category={category}
        setCategory={setCategory}
        branch={branch}
        setBranch={setBranch}
        categoryOptions={categoryOptions}
        categoriesLoading={categoriesLoading}
        branches={branches}
        chartDataLength={chartData.length}
      />

      {/* Harga per Tanggal */}
      <FadeIn show={!!(branch && branchDetail)}>
        {branch && branchDetail && (
        <div className="card p-4 sm:p-5 rounded-xl border border-tertiary/30 bg-tertiary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                      {formatTanggal(branchDetail.earliestDate)}.
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
                  {formatTanggal(branchDetail.date)}
                  {priceAsOfDate && " (harga yang berlaku pada tanggal yang dicari)"}
                </p>
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 w-full sm:w-auto">
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
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
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
        </div>
        )}
      </FadeIn>

      {/* KPI Summary */}
      <FadeIn show={!!(kpis && !branch)}>
        {kpis && !branch && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 sm:p-5 border border-secondary/15 rounded-xl transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">
                Cabang Termahal · {sheetType || "Semua Sheet"} · {mode || "Semua Mode"} · {category || "Semua Kategori"}
              </p>
              <div className="p-1.5 rounded-lg bg-rose-500/10">
                <TrendingUp size={15} className="text-rose-500" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-[1.4rem] font-display text-primary leading-none">{kpis.highestDest}</span>
            </div>
            <p className="text-[1.05rem] font-semibold text-primary mb-2">{formatRupiah(kpis.highestPrice)}</p>
            <div className="h-1.5 rounded-full bg-neutral overflow-hidden">
              <div className="h-full rounded-full bg-rose-500" style={{ width: "100%" }} />
            </div>
          </div>
          <div className="card p-4 sm:p-5 border border-secondary/15 rounded-xl transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase">
                Cabang Termurah · {sheetType || "Semua Sheet"} · {mode || "Semua Mode"} · {category || "Semua Kategori"}
              </p>
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <TrendingDown size={15} className="text-emerald-500" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-[1.4rem] font-display text-primary leading-none">{kpis.lowestDest}</span>
            </div>
            <p className="text-[1.05rem] font-semibold text-primary mb-2">{formatRupiah(kpis.lowestPrice)}</p>
            <div className="h-1.5 rounded-full bg-neutral overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${kpis.highestPrice ? (kpis.lowestPrice / kpis.highestPrice) * 100 : 0}%` }}
              />
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
            <p className="text-[1.4rem] font-display text-primary leading-none mb-2">{formatRupiah(kpis.range)}</p>
            <p className="text-[0.78rem] text-secondary">
              Selisih antara cabang termurah &amp; termahal saat ini
            </p>
          </div>
        </div>
        )}
      </FadeIn>

      {/* Chart Card */}
      <PriceTrendChart
        chartData={chartData}
        branches={branches}
        yDomain={yDomain}
        latestPrices={latestPrices}
        branchTrend={branchTrend}
        maxPrice={maxPrice}
        loading={loading}
        isRefetching={isRefetching}
        sheetType={sheetType}
        mode={mode}
        category={category}
        branch={branch}
      />
    </div>
  );
}
