import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { Upload, Eye, ArrowRight, History, AlertCircle, FileSpreadsheet } from "lucide-react";

interface UploadRow {
  id: number;
  fileName: string;
  uploadedBy: string | null;
  uploadedAt: string;
  priceDate: string | null;
  effectiveDate: string;
  status: "PARSED" | "PARTIAL" | "FAILED";
  _count: { items: number };
  isSuperseded: boolean;
}

interface PaginatedResult {
  rows: UploadRow[];
  total: number;
}

const STATUS_CLASS: Record<UploadRow["status"], string> = {
  PARSED:  "badge bg-emerald-500/10 text-emerald-600 border-emerald-500/25",
  PARTIAL: "badge bg-amber-500/10 text-amber-600 border-amber-500/25",
  FAILED:  "badge bg-rose-500/10 text-rose-600 border-rose-500/25",
};
const STATUS_LABEL: Record<UploadRow["status"], string> = {
  PARSED:  "Berhasil",
  PARTIAL: "Sebagian",
  FAILED:  "Gagal",
};

export default function PriceListHistoryPage() {
  const [rows, setRows]       = useState<UploadRow[]>([]);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setLoading(true);
    api.get(`/pricelist/uploads?page=${page}&pageSize=${pageSize}`)
      .then((res) => {
        const data: PaginatedResult = res.data;
        setRows(data.rows);
        setTotal(data.total);
      })
      .catch((err: any) => {
        setError(err?.response?.data?.message || err?.message || "Gagal memuat riwayat upload");
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2 border-b border-secondary/10">
        <div>
          <h1 className="text-[2.6rem] font-display text-primary tracking-[-0.02em] leading-none mb-2">
            Riwayat Upload
          </h1>
          <p className="text-[0.95rem] text-secondary">
            {loading ? "Memuat data..." : `${total} upload price list tercatat`}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/pricelist" className="btn-secondary inline-flex items-center gap-2">
            <History size={16} />
            Dashboard
          </Link>
          <Link
            to="/pricelist/upload"
            className="btn-primary inline-flex items-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99]"
          >
            <Upload size={18} />
            Upload Baru
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-500/25 bg-rose-500/5 px-4 py-3.5 text-sm text-rose-600">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface shadow-md border border-secondary/20 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary/20">
            <thead className="bg-neutral/50">
              <tr>
                {[
                  { label: "Berlaku Mulai", note: "Tanggal harga berlaku" },
                  { label: "File" },
                  { label: "Diupload Oleh" },
                  { label: "Waktu Upload" },
                  { label: "Baris Harga" },
                  { label: "Status Parsing" },
                  { label: "" },
                ].map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    className={`px-6 py-4 text-left text-[0.72rem] tracking-[0.06em] font-semibold text-secondary uppercase ${h.label === "" ? "text-right" : ""}`}
                  >
                    {h.label}
                    {h.note && <span className="hidden lg:block text-[0.65rem] font-normal tracking-normal normal-case text-secondary/50">{h.note}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary/15">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 w-24 skeleton" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-40 skeleton" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-28 skeleton" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-32 skeleton" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-16 skeleton" /></td>
                    <td className="px-6 py-5"><div className="h-6 w-20 skeleton rounded-full" /></td>
                    <td className="px-6 py-5 text-right"><div className="inline-block h-4 w-14 skeleton" /></td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="w-16 h-16 bg-neutral rounded-full flex items-center justify-center mb-4 border border-secondary/20">
                        <FileSpreadsheet className="w-8 h-8 text-secondary" />
                      </div>
                      <h3 className="text-lg font-semibold text-primary mb-1">Belum ada upload</h3>
                      <p className="text-secondary text-sm leading-relaxed mb-4">
                        Upload file price list pertama Anda untuk mulai melacak timeline harga.
                      </p>
                      <Link to="/pricelist/upload" className="btn-secondary py-2 px-4 text-sm inline-flex items-center gap-1.5">
                        <Upload size={16} /> Upload Price List
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-neutral/40 transition-colors duration-150 ${row.isSuperseded ? "opacity-60" : ""}`}
                  >
                    {/* Berlaku Mulai — kolom paling penting */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[0.95rem] font-bold text-primary">
                          {new Date(row.effectiveDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        {row.isSuperseded && (
                          <span className="text-[0.68rem] font-mono font-semibold text-secondary/60 uppercase tracking-wide">
                            Digantikan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[0.88rem] text-secondary max-w-[200px] truncate font-mono">
                      {row.fileName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[0.9rem] text-secondary">
                      {row.uploadedBy ?? <span className="text-secondary/40">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[0.88rem] text-secondary">
                      {new Date(row.uploadedAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[0.9rem] font-mono text-secondary">
                      {row._count.items.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={STATUS_CLASS[row.status]}>
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        to={`/pricelist/uploads/${row.id}`}
                        className="p-1.5 text-secondary hover:text-tertiary hover:bg-tertiary/10 rounded-md transition-all duration-150 inline-flex items-center gap-1 text-[0.85rem]"
                      >
                        <Eye size={16} />
                        <span className="hidden sm:inline">Detail</span>
                        <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="px-6 py-4 flex items-center justify-between bg-surface border-t border-secondary/20 flex-wrap gap-3">
            <p className="text-[0.9rem] text-secondary">
              Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total} upload
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary px-3.5 py-2 text-sm disabled:opacity-30">
                Sebelumnya
              </button>
              <div className="font-mono text-sm px-3 text-secondary">{page} / {totalPages}</div>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary px-3.5 py-2 text-sm disabled:opacity-30">
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
