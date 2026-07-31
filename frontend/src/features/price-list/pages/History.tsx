import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../lib/api";
import { useTranslation } from "../../../hooks/useTranslation";
import { Upload, Eye, ArrowRight, History as HistoryIcon, AlertCircle, FileSpreadsheet, CornerDownRight, ChevronLeft, ChevronRight } from "lucide-react";

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

interface UploadGroup {
  effectiveDate: string;
  items: UploadRow[];
}

const STATUS_CLASS: Record<UploadRow["status"], string> = {
  PARSED:  "badge bg-emerald-500/10 text-emerald-600 border-emerald-500/25",
  PARTIAL: "badge bg-amber-500/10 text-amber-600 border-amber-500/25",
  FAILED:  "badge bg-rose-500/10 text-rose-600 border-rose-500/25",
};

export default function History() {
  const { t } = useTranslation();
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

  // Kelompokkan per effectiveDate, biar versi lama (isSuperseded) nempel
  // langsung di bawah versi aktifnya alih-alih tersebar mengikuti uploadedAt global.
  const groups: UploadGroup[] = useMemo(() => {
    const map = new Map<string, UploadRow[]>();
    for (const row of rows) {
      const key = row.effectiveDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }

    const result = Array.from(map.entries()).map(([effectiveDate, items]) => ({
      effectiveDate,
      // Versi aktif (belum digantikan) selalu di atas, lalu sisanya dari yang terbaru
      items: [...items].sort((a, b) => {
        if (a.isSuperseded !== b.isSuperseded) return a.isSuperseded ? 1 : -1;
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }),
    }));

    result.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    return result;
  }, [rows]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2 border-b border-secondary/10">
        <div>
          <h1 className="text-[2.6rem] font-display text-primary tracking-[-0.02em] leading-none mb-2">
            {t('pl_history_title')}
          </h1>
          <p className="text-[0.95rem] text-secondary">
            {loading ? t('state_loading') : t('pl_history_subtitle', { total })}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/pricelist" className="btn-secondary inline-flex items-center gap-2">
            <HistoryIcon size={16} />
            {t('nav_dashboard')}
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

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-500/25 bg-rose-500/5 px-4 py-3.5 text-sm text-rose-600">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface shadow-md border border-secondary/20 rounded-lg overflow-hidden">

        {/* Mobile list view — kartu ringkas per upload, dikelompokkan per tanggal berlaku
            sama seperti tabel, supaya tidak perlu scroll horizontal di layar sempit. */}
        <div className="sm:hidden">
          {loading ? (
            <div className="divide-y divide-secondary/15">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 animate-pulse space-y-2">
                  <div className="h-4 w-28 skeleton" />
                  <div className="h-3 w-full max-w-[220px] skeleton" />
                  <div className="h-3 w-32 skeleton" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-neutral rounded-full flex items-center justify-center mb-4 border border-secondary/20">
                  <FileSpreadsheet className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-primary mb-1">{t('pl_history_empty')}</h3>
                <p className="text-secondary text-sm leading-relaxed mb-4">
                  {t('pl_history_empty_desc')}
                </p>
                <Link to="/pricelist/upload" className="btn-secondary py-2 px-4 text-sm inline-flex items-center gap-1.5">
                  <Upload size={16} /> {t('pl_upload_title')}
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-secondary/10">
              {groups.map((group, gi) => (
                <div key={group.effectiveDate} className={`p-3 ${gi % 2 === 1 ? "bg-neutral/30" : "bg-surface"}`}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[0.9rem] font-bold text-primary">
                      {new Date(group.effectiveDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {group.items.length > 1 && (
                      <span className="text-[0.62rem] font-mono font-semibold text-tertiary/70 uppercase tracking-wide">
                        {group.items.length} versi
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {group.items.map((row) => (
                      <Link
                        key={row.id}
                        to={`/pricelist/uploads/${row.id}`}
                        className={`block rounded-lg border bg-surface p-3 transition-colors duration-150 active:bg-tertiary/[0.06] ${row.isSuperseded ? "opacity-55 border-secondary/10" : "border-secondary/20"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {row.isSuperseded && <CornerDownRight size={13} className="text-secondary/40 shrink-0" />}
                            <span className="text-[0.85rem] font-mono text-secondary truncate">{row.fileName}</span>
                          </div>
                          <span className={`${STATUS_CLASS[row.status]} shrink-0`}>
                            {t(`pl_status_${row.status.toLowerCase()}` as any)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[0.78rem] text-secondary">
                          <span className="truncate">
                            {row.uploadedBy ?? "—"} ·{" "}
                            {new Date(row.uploadedAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="shrink-0 font-mono flex items-center gap-1 text-tertiary">
                            {row._count.items.toLocaleString("id-ID")} baris
                            <ArrowRight size={12} />
                          </span>
                        </div>
                        {row.isSuperseded && (
                          <p className="text-[0.62rem] uppercase tracking-wide text-secondary/40 font-mono mt-1">
                            · digantikan
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop table view */}
        <div className="hidden sm:block overflow-x-auto">
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

            {loading ? (
              <tbody className="divide-y divide-secondary/15">
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 w-24 skeleton" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-40 skeleton" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-28 skeleton" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-32 skeleton" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-16 skeleton" /></td>
                    <td className="px-6 py-5"><div className="h-6 w-20 skeleton rounded-full" /></td>
                    <td className="px-6 py-5 text-right"><div className="inline-block h-4 w-14 skeleton" /></td>
                  </tr>
                ))}
              </tbody>
            ) : rows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="w-16 h-16 bg-neutral rounded-full flex items-center justify-center mb-4 border border-secondary/20">
                        <FileSpreadsheet className="w-8 h-8 text-secondary" />
                      </div>
                      <h3 className="text-lg font-semibold text-primary mb-1">{t('pl_history_empty')}</h3>
                      <p className="text-secondary text-sm leading-relaxed mb-4">
                        {t('pl_history_empty_desc')}
                      </p>
                      <Link to="/pricelist/upload" className="btn-secondary py-2 px-4 text-sm inline-flex items-center gap-1.5">
                        <Upload size={16} /> {t('pl_upload_title')}
                      </Link>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : (
              groups.map((group, gi) => (
                <tbody
                  key={group.effectiveDate}
                  className={`divide-y divide-secondary/10 ${gi % 2 === 1 ? "bg-neutral/30" : "bg-surface"}`}
                >
                  {group.items.map((row, ri) => {
                    const isHead = ri === 0;
                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-tertiary/[0.04] transition-colors duration-150 ${row.isSuperseded ? "opacity-55" : ""} ${gi > 0 && isHead ? "border-t-2 border-secondary/15" : ""}`}
                      >
                        {/* Kolom Berlaku Mulai — di-merge (rowSpan) untuk seluruh grup */}
                        {isHead && (
                          <td
                            rowSpan={group.items.length}
                            className="px-6 py-4 align-top whitespace-nowrap border-r border-dashed border-secondary/20"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-[0.95rem] font-bold text-primary">
                                {new Date(group.effectiveDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                              {group.items.length > 1 && (
                                <span className="text-[0.65rem] font-mono font-semibold text-tertiary/70 uppercase tracking-wide">
                                  {group.items.length} versi
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        <td className={`px-6 py-4 text-[0.88rem] max-w-[220px] font-mono ${row.isSuperseded ? "text-secondary/70" : "text-secondary"}`}>
                          <div className={`flex items-center gap-1.5 min-w-0 ${!isHead ? "pl-3 border-l-2 border-dashed border-secondary/25" : ""}`}>
                            {!isHead && <CornerDownRight size={13} className="text-secondary/40 shrink-0" />}
                            <span className="truncate">{row.fileName}</span>
                            {!isHead && (
                              <span className="shrink-0 text-[0.62rem] uppercase tracking-wide text-secondary/40 font-mono">
                                · digantikan
                              </span>
                            )}
                          </div>
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
                            {t(`pl_status_${row.status.toLowerCase()}` as any)}
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
                    );
                  })}
                </tbody>
              ))
            )}
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="px-4 sm:px-6 py-4 bg-surface border-t border-secondary/20 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.82rem] sm:text-[0.9rem] text-secondary text-center sm:text-left order-2 sm:order-1">
              Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total} upload
            </p>
            <div className="flex items-center justify-between gap-2 order-1 sm:order-2 sm:justify-start">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Sebelumnya"
                className="btn-secondary p-2.5 sm:px-3.5 sm:py-2 text-sm disabled:opacity-30 shrink-0 flex items-center justify-center"
              >
                <ChevronLeft size={16} className="sm:hidden" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>
              <div className="font-mono text-[0.8rem] sm:text-sm text-secondary shrink-0 whitespace-nowrap text-center flex-1 sm:flex-none sm:px-3">{page} / {totalPages}</div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Selanjutnya"
                className="btn-secondary p-2.5 sm:px-3.5 sm:py-2 text-sm disabled:opacity-30 shrink-0 flex items-center justify-center"
              >
                <ChevronRight size={16} className="sm:hidden" />
                <span className="hidden sm:inline">Selanjutnya</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
