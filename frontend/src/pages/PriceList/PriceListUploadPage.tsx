import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, ArrowLeft, Eye, Info } from "lucide-react";

interface UploadResult {
  uploadId: number;
  status: "PARSED" | "PARTIAL" | "FAILED";
  effectiveDate: string;
  priceDate: string | null;
  itemCount: number;
  warnings: string[];
  hasOlderVersions: boolean;
}

const STATUS_CLASS: Record<UploadResult["status"], string> = {
  PARSED:  "badge bg-emerald-500/10 text-emerald-600 border-emerald-500/25",
  PARTIAL: "badge bg-amber-500/10 text-amber-600 border-amber-500/25",
  FAILED:  "badge bg-rose-500/10 text-rose-600 border-rose-500/25",
};
const STATUS_LABEL: Record<UploadResult["status"], string> = {
  PARSED:  "Berhasil Sepenuhnya",
  PARTIAL: "Berhasil Sebagian",
  FAILED:  "Gagal Diproses",
};

// Default effective date = 1 bulan dari sekarang, awal bulan
function defaultEffectiveDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function PriceListUploadPage() {
  const [dragging, setDragging]     = useState(false);
  const [file, setFile]             = useState<File | null>(null);
  const [effectiveDate, setEffectiveDate] = useState(defaultEffectiveDate());
  const [uploading, setUploading]   = useState(false);
  const [result, setResult]         = useState<UploadResult | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); setResult(null); setError(null); }
  }, []);

  const handleUpload = async () => {
    if (!file || !effectiveDate) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("effectiveDate", effectiveDate);
      const res = await api.post("/pricelist/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data as UploadResult);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Upload gagal";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setError(null); };

  const canUpload = !!file && !!effectiveDate && !uploading;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2 border-b border-secondary/10">
        <div>
          <h1 className="text-[2.6rem] font-display text-primary tracking-[-0.02em] leading-none mb-2">
            Upload Price List
          </h1>
          <p className="text-[0.95rem] text-secondary">
            Upload file Excel (.xlsx) — sistem akan otomatis membaca dan menyimpan semua data harga.
          </p>
        </div>
        <Link to="/pricelist/uploads" className="btn-secondary inline-flex items-center gap-2 shrink-0">
          <ArrowLeft size={16} />
          Riwayat Upload
        </Link>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">

        {/* Tanggal Berlaku — WAJIB */}
        <div className="card p-5 border border-secondary/20 space-y-3">
          <div className="flex items-center gap-2">
            <label htmlFor="effectiveDate" className="text-[0.95rem] font-semibold text-primary">
              Tanggal Berlaku
            </label>
            <span className="text-rose-500 text-sm font-bold">*</span>
          </div>
          <input
            id="effectiveDate"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="form-input w-full sm:w-auto"
            required
          />
          <p className="text-[0.82rem] text-secondary flex items-start gap-1.5">
            <Info size={13} className="shrink-0 mt-0.5 text-tertiary" />
            Harga dalam file ini berlaku mulai tanggal ini. Digunakan sebagai acuan timeline di Dashboard.
            Jika ada upload lain dengan tanggal berlaku yang sama, kedua versi akan tersimpan dan sistem
            menggunakan versi terbaru.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`card border-2 border-dashed rounded-lg p-10 text-center transition-all duration-200 ${
            dragging
              ? "border-tertiary bg-tertiary/5 scale-[1.01]"
              : file
              ? "border-tertiary/40 bg-tertiary/5"
              : "border-secondary/25 hover:border-secondary/40 hover:bg-neutral/30"
          }`}
        >
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-tertiary/10">
                <FileSpreadsheet size={32} className="text-tertiary" />
              </div>
              <div>
                <p className="font-semibold text-primary text-[1rem]">{file.name}</p>
                <p className="text-[0.85rem] text-secondary mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={reset}
                className="text-[0.8rem] text-secondary hover:text-rose-500 flex items-center gap-1 transition-colors mt-1"
              >
                <X size={14} /> Ganti file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-secondary/10">
                <Upload size={32} className="text-secondary" />
              </div>
              <div>
                <p className="text-primary font-medium mb-1">Tarik &amp; lepas file .xlsx di sini</p>
                <p className="text-[0.85rem] text-secondary">atau klik tombol di bawah untuk memilih file</p>
              </div>
              <label className="btn-secondary cursor-pointer text-sm py-2 px-4 inline-flex items-center gap-2">
                <FileSpreadsheet size={15} />
                Pilih File
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setResult(null); setError(null); } }}
                />
              </label>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {(file || result) && (
          <div className="flex items-center gap-3">
            {!result && (
              <button
                onClick={handleUpload}
                disabled={!canUpload}
                className="btn-primary inline-flex items-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload &amp; Proses
                  </>
                )}
              </button>
            )}
            {!uploading && (
              <button onClick={reset} className="btn-secondary text-sm py-2 px-4">
                {result ? "Upload Lagi" : "Batal"}
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-rose-500/25 bg-rose-500/5 px-4 py-3.5 text-sm text-rose-600">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Upload gagal</p>
              <p className="text-rose-500/80">{error}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="card border border-secondary/20 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-secondary/10 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span className="font-semibold text-primary text-[0.95rem]">
                  Upload #{result.uploadId} selesai diproses
                </span>
              </div>
              <span className={STATUS_CLASS[result.status]}>
                {STATUS_LABEL[result.status]}
              </span>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[0.72rem] uppercase tracking-wider font-semibold text-secondary mb-0.5">Berlaku Mulai</p>
                  <p className="text-[1.1rem] font-bold text-primary">
                    {new Date(result.effectiveDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div>
                  <p className="text-[0.72rem] uppercase tracking-wider font-semibold text-secondary mb-0.5">Baris Harga Terbaca</p>
                  <p className="text-[1.5rem] font-bold font-mono text-primary leading-none">{result.itemCount.toLocaleString("id-ID")}</p>
                </div>
              </div>

              {result.hasOlderVersions && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
                  <Info size={15} className="shrink-0 mt-0.5" />
                  <p>
                    Ada upload lain dengan tanggal berlaku yang sama. Upload ini tersimpan sebagai versi terbaru
                    dan akan digunakan di Dashboard. Versi sebelumnya tetap tersimpan di Riwayat Upload.
                  </p>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-[0.8rem] font-semibold text-amber-600 mb-2 flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    {result.warnings.length} peringatan — perlu dicek manual
                  </p>
                  <ul className="text-[0.8rem] text-secondary space-y-1 list-disc list-inside">
                    {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Link
                  to={`/pricelist/uploads/${result.uploadId}`}
                  className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2"
                >
                  <Eye size={15} />
                  Lihat Detail Upload
                </Link>
                <button onClick={reset} className="btn-secondary text-sm py-2 px-4">
                  Upload Lagi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
