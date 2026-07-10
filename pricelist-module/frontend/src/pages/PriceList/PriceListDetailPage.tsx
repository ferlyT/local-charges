import { useEffect, useState } from "react";

interface DiffRow {
  sheetType: string;
  mode: string;
  destination: string;
  category: string;
  currentPrice: number;
  previousPrice: number | null;
  delta: number | null;
  deltaPct: number | null;
}

interface DiffResponse {
  currentUploadId: number;
  previousUploadId: number | null;
  diff: DiffRow[];
}

function formatRupiah(v: number) {
  return v.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
}

export default function PriceListDetailPage({ uploadId }: { uploadId: number }) {
  const [data, setData] = useState<DiffResponse | null>(null);
  const [onlyChanged, setOnlyChanged] = useState(false);

  useEffect(() => {
    fetch(`/api/pricelist/uploads/${uploadId}/diff`)
      .then((r) => r.json())
      .then(setData);
  }, [uploadId]);

  if (!data) {
    return <p className="text-center py-16 font-[Public_Sans] text-ink/50">Memuat...</p>;
  }

  const rows = onlyChanged ? data.diff.filter((r) => r.delta !== null && r.delta !== 0) : data.diff;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="font-[Fraunces] text-3xl text-ink mb-1">Detail Upload #{data.currentUploadId}</h1>
      <p className="font-[Public_Sans] text-sm text-ink/60 mb-6">
        {data.previousUploadId
          ? `Dibandingkan dengan upload #${data.previousUploadId} sebelumnya.`
          : "Tidak ada upload sebelumnya untuk dibandingkan — ini upload pertama."}
      </p>

      <label className="flex items-center gap-2 mb-4 text-sm font-[Public_Sans] text-ink/70">
        <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />
        Tampilkan yang berubah saja
      </label>

      <table className="w-full text-sm font-[Public_Sans]">
        <thead>
          <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wide text-ink/50">
            <th className="py-2 pr-4">Tipe</th>
            <th className="py-2 pr-4">Mode</th>
            <th className="py-2 pr-4">Tujuan</th>
            <th className="py-2 pr-4">Kategori</th>
            <th className="py-2 pr-4 text-right">Harga Sebelumnya</th>
            <th className="py-2 pr-4 text-right">Harga Sekarang</th>
            <th className="py-2 text-right">Perubahan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-ink/5">
              <td className="py-2 pr-4 text-ink/70">{r.sheetType}</td>
              <td className="py-2 pr-4 text-ink/70">{r.mode}</td>
              <td className="py-2 pr-4 text-ink/70">{r.destination}</td>
              <td className="py-2 pr-4 text-ink">{r.category}</td>
              <td className="py-2 pr-4 text-right text-ink/50">
                {r.previousPrice !== null ? formatRupiah(r.previousPrice) : "—"}
              </td>
              <td className="py-2 pr-4 text-right text-ink">{formatRupiah(r.currentPrice)}</td>
              <td className="py-2 text-right">
                {r.delta === null ? (
                  <span className="text-ink/40">baru</span>
                ) : r.delta === 0 ? (
                  <span className="text-ink/40">tetap</span>
                ) : (
                  <span className={r.delta > 0 ? "text-rust" : "text-emerald-700"}>
                    {r.delta > 0 ? "▲" : "▼"} {formatRupiah(Math.abs(r.delta))} ({r.deltaPct?.toFixed(1)}%)
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
