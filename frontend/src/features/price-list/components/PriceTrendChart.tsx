import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ComposedChart,
  Line,
  Area,
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
  BarChart3,
  LineChart as LineChartIcon,
  Table as TableIcon,
  Search,
  X,
  Minus,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

function formatRupiah(v: number) {
  return `Rp ${v.toLocaleString("id-ID")}`;
}

const LINE_COLORS = [
  "#2a78d6", "#1baf7a", "#eda100", "#4a3aa7", "#e34948", "#e87ba4", "#eb6834",
];

export function PriceTrendChart({
  chartData,
  branches,
  yDomain,
  latestPrices,
  branchTrend,
  maxPrice,
  loading,
  isRefetching = false,
  sheetType,
  mode,
  category,
  branch,
}: {
  chartData: any[];
  branches: string[];
  yDomain: (string | number)[];
  latestPrices: Record<string, number>;
  branchTrend: Record<string, { delta: number; pct: number } | null>;
  maxPrice: number;
  loading: boolean;
  isRefetching?: boolean;
  sheetType: string;
  mode: string;
  category: string;
  branch: string;
}) {
  const [hiddenBranches, setHiddenBranches] = useState<Set<string>>(new Set());
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const [branchQuery, setBranchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  const visibleBranches = branches.filter((d) =>
    d.toLowerCase().includes(branchQuery.trim().toLowerCase())
  );

  function toggleBranch(d: string) {
    setHiddenBranches((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  const biggestMover = (() => {
    if (!branchTrend) return null;
    let best: { branch: string; delta: number; pct: number } | null = null;
    for (const [b, tr] of Object.entries(branchTrend)) {
      if (!tr || tr.delta === 0) continue;
      if (!best || Math.abs(tr.pct) > Math.abs(best.pct)) {
        best = { branch: b, delta: tr.delta, pct: tr.pct };
      }
    }
    return best;
  })();

  return (
    <div className="card bg-surface shadow-md border border-secondary/20 rounded-xl overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-secondary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-tertiary/10 shrink-0">
            <BarChart3 size={18} className="text-tertiary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[1rem] font-semibold text-primary flex items-center gap-2">
              Tren Harga
              {isRefetching && (
                <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-tertiary transition-opacity duration-200">
                  <span className="w-3 h-3 border-2 border-tertiary/30 border-t-tertiary rounded-full animate-spin shrink-0" />
                  Memperbarui…
                </span>
              )}
            </h2>
            <p className="text-[0.78rem] text-secondary truncate">
              {sheetType || "—"} · {mode || "—"} · {category || "—"}
            </p>
          </div>
        </div>
        {chartData.length > 0 && !loading && (
          <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral border border-secondary/15 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[0.78rem] font-medium transition-all ${viewMode === "chart" ? "bg-surface shadow-sm text-primary" : "text-secondary"
                }`}
            >
              <LineChartIcon size={14} />
              Grafik
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[0.78rem] font-medium transition-all ${viewMode === "table" ? "bg-surface shadow-sm text-primary" : "text-secondary"
                }`}
            >
              <TableIcon size={14} />
              Tabel
            </button>
          </div>
        )}
      </div>

      {biggestMover && !branch && !loading && (
        <div className="px-4 sm:px-6 py-3 bg-tertiary/5 border-b border-secondary/10 flex items-start sm:items-center gap-2.5">
          <Lightbulb size={15} className="text-tertiary shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-[0.82rem] text-primary">
            <span className="font-semibold">{biggestMover.branch}</span> mengalami perubahan harga
            terbesar:{" "}
            <span className={`font-semibold ${biggestMover.delta > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {biggestMover.delta > 0 ? "naik" : "turun"} {formatRupiah(Math.abs(biggestMover.delta))}
              {" "}({Math.abs(biggestMover.pct).toFixed(1)}%)
            </span>{" "}
            sejak awal periode.
          </p>
        </div>
      )}

      <div className="p-4 sm:p-6">
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
          <div className={`transition-opacity duration-300 ${isRefetching ? "opacity-50" : "opacity-100"}`}>
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

            {!branch && visibleBranches.length > 0 && (
              <div className="hidden sm:flex items-center gap-3 px-2.5 mb-1.5 text-[0.68rem] font-semibold text-secondary/70 uppercase tracking-[0.04em]">
                <span className="w-5 shrink-0 text-right">#</span>
                <span className="w-2.5 shrink-0" />
                <span className="w-16 shrink-0">Cabang</span>
                <span className="flex-1">Posisi Harga</span>
                <span className="w-28 shrink-0 text-right">Harga Terkini</span>
                <span className="w-16 shrink-0 text-right">Tren</span>
              </div>
            )}
            {!branch && (
              <div className="flex flex-col gap-1 mb-5">
                {visibleBranches.map((d) => {
                  const i = branches.indexOf(d);
                  const color = LINE_COLORS[i % LINE_COLORS.length];
                  const isHidden = hiddenBranches.has(d);
                  const price = latestPrices[d];
                  const barPct = maxPrice && price != null ? Math.max(4, (price / maxPrice) * 100) : 0;
                  const tr = branchTrend?.[d] ?? null;
                  const trendChip = tr && tr.delta !== 0 ? (
                    <span className={`flex items-center gap-0.5 ${tr.delta > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {tr.delta > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {Math.abs(tr.pct).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-secondary">
                      <Minus size={12} />
                    </span>
                  );
                  return (
                    <div key={d}>
                      <button
                        type="button"
                        onClick={() => toggleBranch(d)}
                        className={`sm:hidden w-full flex flex-col gap-1.5 px-2.5 py-2.5 rounded-lg text-left transition-all ${isHidden ? "opacity-40" : "active:bg-neutral"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[0.7rem] font-semibold text-secondary shrink-0 tabular-nums">
                              {i + 1}
                            </span>
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ background: isHidden ? "var(--color-secondary, #94a3b8)" : color }}
                            />
                            <span className="text-[0.85rem] font-semibold text-primary truncate">{d}</span>
                          </div>
                          <span className="text-[0.75rem] font-medium tabular-nums shrink-0">{trendChip}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="flex-1 h-1.5 rounded-full bg-neutral overflow-hidden">
                            <span
                              className="block h-full rounded-full transition-all"
                              style={{ width: `${barPct}%`, background: isHidden ? "var(--color-secondary, #94a3b8)" : color }}
                            />
                          </span>
                          <span className="text-[0.8rem] font-medium text-primary tabular-nums shrink-0">
                            {price != null ? formatRupiah(price) : "—"}
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleBranch(d)}
                        onMouseEnter={() => setActiveBranch(d)}
                        onMouseLeave={() => setActiveBranch(null)}
                        className={`hidden sm:flex items-center gap-3 px-2.5 py-2 rounded-lg text-left w-full transition-all ${isHidden ? "opacity-40" : "hover:bg-neutral"
                          }`}
                      >
                        <span className="w-5 shrink-0 text-[0.72rem] font-semibold text-secondary text-right tabular-nums">
                          {i + 1}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: isHidden ? "var(--color-secondary, #94a3b8)" : color }}
                        />
                        <span className="w-16 shrink-0 text-[0.85rem] font-semibold text-primary whitespace-nowrap">
                          {d}
                        </span>
                        <span className="flex-1 h-2 rounded-full bg-neutral overflow-hidden min-w-[60px]">
                          <span
                            className="block h-full rounded-full transition-all"
                            style={{ width: `${barPct}%`, background: isHidden ? "var(--color-secondary, #94a3b8)" : color }}
                          />
                        </span>
                        <span className="w-28 shrink-0 text-right text-[0.85rem] font-medium text-primary tabular-nums">
                          {price != null ? formatRupiah(price) : "—"}
                        </span>
                        <span className="w-16 shrink-0 flex items-center justify-end gap-0.5 text-[0.75rem] font-medium tabular-nums">
                          {trendChip}
                        </span>
                      </button>
                    </div>
                  );
                })}
                {visibleBranches.length === 0 && (
                  <p className="text-sm text-secondary py-1">Tidak ada cabang yang cocok dengan pencarian.</p>
                )}
              </div>
            )}

            {viewMode === "chart" ? (
              <div className="h-[280px] sm:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <defs>
                      {branches.map((d) => {
                        const i = branches.indexOf(d);
                        const color = LINE_COLORS[i % LINE_COLORS.length];
                        return (
                          <linearGradient key={d} id={`fill-${d}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 6" stroke="var(--color-secondary, #94a3b8)" strokeOpacity={0.15} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "var(--color-secondary, #64748b)" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--color-secondary, #94a3b8)", strokeOpacity: 0.2 }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      minTickGap={24}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      width={44}
                      tick={{ fontSize: 11, fill: "var(--color-secondary, #64748b)" }}
                      tickLine={false}
                      axisLine={false}
                      domain={yDomain as any}
                      tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid rgba(0,0,0,0.06)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        fontSize: "0.85rem",
                        padding: "10px 14px",
                      }}
                      formatter={(v: any, name: any) => [formatRupiah(v as number), name]}
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                      }
                      labelStyle={{ fontWeight: 600, marginBottom: "4px" }}
                      itemSorter={(item) => -(item.value as number)}
                    />
                    {activeBranch && !hiddenBranches.has(activeBranch) && (
                      <Area
                        dataKey={activeBranch}
                        stroke="none"
                        fill={`url(#fill-${activeBranch})`}
                        connectNulls
                        isAnimationActive={false}
                        legendType="none"
                        tooltipType="none"
                        activeDot={false}
                      />
                    )}
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
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 rounded-lg border border-secondary/10">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-secondary/15 bg-neutral/60">
                      <th className="text-left py-2.5 pr-4 pl-2 font-semibold text-secondary text-[0.78rem] uppercase tracking-[0.04em] sticky left-0 bg-neutral/95 backdrop-blur">
                        Tanggal Berlaku
                      </th>
                      {visibleBranches
                        .filter((d) => !hiddenBranches.has(d))
                        .map((d) => (
                          <th key={d} className="text-right py-2.5 px-4 font-semibold text-primary whitespace-nowrap">
                            {d}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, idx) => (
                      <tr
                        key={String(row.date)}
                        className={`border-b border-secondary/10 last:border-0 ${idx % 2 === 1 ? "bg-neutral/30" : "bg-transparent"
                          }`}
                      >
                        <td className="py-2.5 pr-4 pl-2 text-secondary whitespace-nowrap sticky left-0 bg-inherit">
                          {new Date(String(row.date)).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        {visibleBranches
                          .filter((d) => !hiddenBranches.has(d))
                          .map((d) => (
                            <td key={d} className="text-right py-2.5 px-4 text-primary whitespace-nowrap tabular-nums">
                              {row[d] != null ? formatRupiah(Number(row[d])) : "—"}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
