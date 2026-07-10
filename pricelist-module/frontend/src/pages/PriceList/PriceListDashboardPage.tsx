import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TrendPoint {
  uploadId: number;
  date: string;
  sheetType: string;
  mode: string;
  destination: string;
  category: string;
  price: number;
}

interface FilterOptions {
  sheetTypes: string[];
  modes: string[];
  destinations: string[];
  categories: string[];
}

const LINE_COLORS = ["#8b3a2f", "#2f3b3a", "#c98a5e", "#4a6670", "#a3906b", "#6b4c57"];

export default function PriceListDashboardPage() {
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [sheetType, setSheetType] = useState("");
  const [mode, setMode] = useState("");
  const [category, setCategory] = useState("");
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/pricelist/filters")
      .then((r) => r.json())
      .then((data: FilterOptions) => {
        setOptions(data);
        setSheetType(data.sheetTypes[0] ?? "");
        setMode(data.modes[0] ?? "");
        setCategory(data.categories[0] ?? "");
      });
  }, []);

  useEffect(() => {
    if (!sheetType && !mode && !category) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (sheetType) params.set("sheetType", sheetType);
    if (mode) params.set("mode", mode);
    if (category) params.set("category", category);
    fetch(`/api/pricelist/trend?${params.toString()}`)
      .then((r) => r.json())
      .then((data: TrendPoint[]) => setTrend(data))
      .finally(() => setLoading(false));
  }, [sheetType, mode, category]);

  // pivot: satu baris per tanggal, satu kolom per tujuan, untuk multi-line chart
  const { chartData, destinations } = useMemo(() => {
    const destSet = new Set<string>();
    const byDate = new Map<string, Record<string, number | string>>();
    for (const t of trend) {
      destSet.add(t.destination);
      const row = byDate.get(t.date) ?? { date: t.date };
      row[t.destination] = t.price;
      byDate.set(t.date, row);
    }
    return {
      chartData: Array.from(byDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date))),
      destinations: Array.from(destSet),
    };
  }, [trend]);

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <h1 className="font-[Fraunces] text-3xl text-ink mb-1">Dashboard Price List</h1>
      <p className="font-[Public_Sans] text-sm text-ink/60 mb-8">
        Tren harga per tanggal upload, dipecah per tujuan.
      </p>

      <div className="flex flex-wrap gap-4 mb-8">
        <FilterSelect label="Tipe" value={sheetType} onChange={setSheetType} options={options?.sheetTypes ?? []} />
        <FilterSelect label="Mode" value={mode} onChange={setMode} options={options?.modes ?? []} />
        <FilterSelect label="Kategori" value={category} onChange={setCategory} options={options?.categories ?? []} />
      </div>

      <div className="rounded-lg border border-ink/10 p-6">
        {loading ? (
          <p className="font-[Public_Sans] text-sm text-ink/50 py-16 text-center">Memuat data...</p>
        ) : chartData.length === 0 ? (
          <p className="font-[Public_Sans] text-sm text-ink/50 py-16 text-center">
            Belum ada data untuk kombinasi filter ini.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d8" />
              <XAxis dataKey="date" tick={{ fontFamily: "Public Sans", fontSize: 12 }} />
              <YAxis
                tick={{ fontFamily: "Public Sans", fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`}
              />
              <Tooltip formatter={(v: number) => v.toLocaleString("id-ID")} />
              <Legend />
              {destinations.map((d, i) => (
                <Line
                  key={d}
                  type="monotone"
                  dataKey={d}
                  name={d}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-xs font-[Space_Grotesk] uppercase tracking-wide text-ink/50 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-ink/20 bg-white px-3 py-2 text-sm font-[Public_Sans] text-ink"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
