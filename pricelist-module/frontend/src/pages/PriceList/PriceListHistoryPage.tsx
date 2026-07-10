import { useEffect, useState } from "react";

interface UploadRow {
  id: number;
  fileName: string;
  uploadedBy: string | null;
  uploadedAt: string;
  priceDate: string | null;
  status: "PARSED" | "PARTIAL" | "FAILED";
  _count: { items: number };
}

const STATUS_STYLE: Record<UploadRow["status"], string> = {
  PARSED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-rust/10 text-rust border-rust/30",
};

export default function PriceListHistoryPage() {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetch(`/api/pricelist/uploads?page=${page}&pageSize=${pageSize}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.rows);
        setTotal(data.total);
      });
  }, [page]);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[Fraunces] text-3xl text-ink mb-1">Riwayat Upload Price List</h1>
          <p className="font-[Public_Sans] text-sm text-ink/60">{total} upload tercatat</p>
        </div>
        <a
          href="/pricelist/upload"
          className="rounded-md bg-ink px-4 py-2 text-sm font-[Public_Sans] font-medium text-white hover:bg-ink/90"
        >
          Upload Baru
        </a>
      </div>

      <table className="w-full text-sm font-[Public_Sans]">
        <thead>
          <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wide text-ink/50">
            <th className="py-2 pr-4">Tanggal Price List</th>
            <th className="py-2 pr-4">File</th>
            <th className="py-2 pr-4">Diupload Oleh</th>
            <th className="py-2 pr-4">Waktu Upload</th>
            <th className="py-2 pr-4">Baris</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-ink/5 hover:bg-limestone/40">
              <td className="py-3 pr-4 text-ink">
                {row.priceDate ? new Date(row.priceDate).toLocaleDateString("id-ID") : "—"}
              </td>
              <td className="py-3 pr-4 text-ink/70">{row.fileName}</td>
              <td className="py-3 pr-4 text-ink/70">{row.uploadedBy ?? "—"}</td>
              <td className="py-3 pr-4 text-ink/50">{new Date(row.uploadedAt).toLocaleString("id-ID")}</td>
              <td className="py-3 pr-4 text-ink/70">{row._count.items}</td>
              <td className="py-3 pr-4">
                <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_STYLE[row.status]}`}>
                  {row.status}
                </span>
              </td>
              <td className="py-3 text-right">
                <a href={`/pricelist/uploads/${row.id}`} className="text-rust hover:underline">
                  Detail →
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between mt-6">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="text-sm font-[Public_Sans] text-ink/60 disabled:opacity-30"
        >
          ← Sebelumnya
        </button>
        <span className="text-sm font-[Public_Sans] text-ink/50">
          Halaman {page} dari {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <button
          disabled={page * pageSize >= total}
          onClick={() => setPage((p) => p + 1)}
          className="text-sm font-[Public_Sans] text-ink/60 disabled:opacity-30"
        >
          Selanjutnya →
        </button>
      </div>
    </div>
  );
}
