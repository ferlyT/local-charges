import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../lib/api";
import { useTranslation } from "../../../hooks/useTranslation";
import { Upload as UploadIcon, FileSpreadsheet, X, CheckCircle2, AlertCircle, ArrowLeft, Eye, Info, Loader2 } from "lucide-react";

interface BranchMarkingPair {
  branch: string;
  markingCode: string | null;
}

interface UploadResult {
  uploadId: number;
  status: "PARSED" | "PARTIAL" | "FAILED";
  effectiveDate: string;
  priceDate: string | null;
  itemCount: number;
  warnings: string[];
  hasOlderVersions: boolean;
  branches: BranchMarkingPair[];
}

interface BranchMarkingRow {
  id: string;
  branch: string;
  markingCode: string;
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

import FadeIn from "../../../components/ui/FadeIn";

// Default effective date = 1 bulan dari sekarang, awal bulan
function defaultEffectiveDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}


export default function Upload() {
  const { t } = useTranslation();
  const [dragging, setDragging]     = useState(false);
  const [file, setFile]             = useState<File | null>(null);
  const [effectiveDate, setEffectiveDate] = useState(defaultEffectiveDate());
  const [uploading, setUploading]   = useState(false);
  const [progress, setProgress]     = useState(0);
  const [processing, setProcessing] = useState(false); // 100% terkirim, menunggu server parsing
  const [result, setResult]         = useState<UploadResult | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const [branchRows, setBranchRows] = useState<BranchMarkingRow[]>([]);
  const [branchInput, setBranchInput] = useState("");
  const [markingInput, setMarkingInput] = useState("");

  const resultRef = useRef<HTMLDivElement | null>(null);
  const errorRef  = useRef<HTMLDivElement | null>(null);

  const locked = uploading; // kunci semua input selama proses upload berjalan

  const addBranchRow = () => {
    if (locked) return;
    const branch = branchInput.trim().toUpperCase();
    if (!branch) return;
    if (branchRows.some((r) => r.branch === branch)) return;
    const markingCode = markingInput.trim().toUpperCase();
    setBranchRows((prev) => [...prev, { id: crypto.randomUUID(), branch, markingCode }]);
    setBranchInput("");
    setMarkingInput("");
  };

  const removeBranchRow = (id: string) => {
    if (locked) return;
    setBranchRows((prev) => prev.filter((r) => r.id !== id));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (locked) return;
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); setResult(null); setError(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  const handleUpload = async () => {
    if (!file || !effectiveDate || uploading) return;
    setUploading(true);
    setProgress(0);
    setProcessing(false);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("effectiveDate", effectiveDate);
      form.append(
        "branches",
        JSON.stringify(branchRows.map((r) => ({ branch: r.branch, markingCode: r.markingCode || null }))),
      );
      const res = await api.post("/pricelist/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const pct = Math.round((evt.loaded * 100) / evt.total);
          setProgress(pct);
          if (pct >= 100) setProcessing(true);
        },
      });
      setProgress(100);
      setResult(res.data as UploadResult);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Upload gagal";
      setError(msg);
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setBranchRows([]);
    setBranchInput("");
    setMarkingInput("");
  };

  const canUpload = !!file && !!effectiveDate && !uploading;

  // Scroll halus ke hasil / error begitu muncul, biar user tidak perlu cari-cari sendiri
  useEffect(() => {
    if (result) {
      const t = setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 250);
      return () => clearTimeout(t);
    }
  }, [result]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
      return () => clearTimeout(t);
    }
  }, [error]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2 border-b border-secondary/10">
        <div>
          <h1 className="text-[2.6rem] font-display text-primary tracking-[-0.02em] leading-none mb-2">
            {t('pl_upload_title')}
          </h1>
          <p className="text-[0.95rem] text-secondary">
            {t('pl_upload_subtitle')}
          </p>
        </div>
        <Link to="/pricelist/uploads" className="btn-secondary inline-flex items-center gap-2 shrink-0">
          <ArrowLeft size={16} />
          {t('pl_btn_history')}
        </Link>
      </div>

      {/* Status untuk screen reader, supaya perubahan proses upload tetap terasa "hidup" tanpa perlu visual */}
      <div aria-live="polite" className="sr-only">
        {uploading
          ? processing
            ? "Mengunggah selesai, sedang memproses file di server."
            : `Mengunggah file, ${progress} persen.`
          : result
          ? "Upload selesai diproses."
          : error
          ? `Upload gagal: ${error}`
          : ""}
      </div>

      <div className="max-w-2xl mx-auto space-y-6">

        {/* Tanggal Berlaku — WAJIB */}
        <div className={`card p-5 border border-secondary/20 space-y-3 transition-opacity duration-300 ${locked ? "opacity-60" : ""}`}>
          <div className="flex items-center gap-2">
            <label htmlFor="effectiveDate" className="text-[0.95rem] font-semibold text-primary">
              {t('pl_upload_effective_date')}
            </label>
            <span className="text-rose-500 text-sm font-bold">*</span>
          </div>
          <input
            id="effectiveDate"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            disabled={locked}
            className="form-input w-full sm:w-auto disabled:cursor-not-allowed"
            required
          />
          <p className="text-[0.82rem] text-secondary flex items-start gap-1.5">
            <Info size={13} className="shrink-0 mt-0.5 text-tertiary" />
            {t('pl_upload_effective_date_help')}
          </p>
        </div>

        {/* Cabang & Marking (pairing) — Opsional */}
        <div className={`card p-5 border border-secondary/20 space-y-4 transition-opacity duration-300 ${locked ? "opacity-60" : ""}`}>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-[0.95rem] font-semibold text-primary">Cabang & Kode Marking</label>
          </div>
          <p className="text-[0.78rem] text-secondary -mt-2">
            Setiap cabang punya kode marking sendiri untuk periode ini. Marking boleh dikosongkan per cabang.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={branchInput}
              onChange={(e) => setBranchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBranchRow(); } }}
              placeholder="Cabang, contoh: GZ"
              disabled={locked}
              className="form-input flex-1 disabled:cursor-not-allowed"
            />
            <input
              type="text"
              value={markingInput}
              onChange={(e) => setMarkingInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBranchRow(); } }}
              placeholder="Marking, contoh: HRT-01 (opsional)"
              disabled={locked}
              className="form-input flex-1 disabled:cursor-not-allowed"
            />
            <button type="button" onClick={addBranchRow} disabled={locked} className="btn-secondary text-sm px-3 disabled:cursor-not-allowed">
              Tambah
            </button>
          </div>

          {branchRows.length > 0 && (
            <div className="space-y-2 mt-3">
              {branchRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-tertiary/5 border border-tertiary/15 transition-all duration-200 animate-[fadeSlideIn_0.2s_ease-out]"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[0.8rem] font-semibold bg-tertiary/10 text-tertiary">
                      {row.branch}
                    </span>
                    <span className="text-secondary text-sm">→</span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[0.8rem] font-medium bg-secondary/10 text-secondary">
                      {row.markingCode || <em className="opacity-60">tanpa marking</em>}
                    </span>
                  </div>
                  <button type="button" onClick={() => removeBranchRow(row.id)} disabled={locked} className="text-secondary hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-[0.78rem] text-secondary mt-1">
            Isi kolom Cabang dan Marking (opsional), lalu tekan Enter atau tombol Tambah.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); if (!locked) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          aria-busy={uploading}
          className={`relative card border-2 border-dashed rounded-lg p-10 text-center transition-all duration-200 overflow-hidden ${
            dragging
              ? "border-tertiary bg-tertiary/5 scale-[1.01]"
              : file
              ? "border-tertiary/40 bg-tertiary/5"
              : "border-secondary/25 hover:border-secondary/40 hover:bg-neutral/30"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative p-4 rounded-full bg-tertiary/10">
                <Loader2 size={32} className="text-tertiary animate-spin" />
              </div>
              <div className="w-full max-w-xs">
                <p className="font-semibold text-primary text-[1rem] truncate mb-0.5">{file?.name}</p>
                <p className="text-[0.85rem] text-secondary mb-3">
                  {processing ? "Memproses di server…" : `Mengunggah… ${progress}%`}
                </p>
                <div className="h-1.5 w-full rounded-full bg-secondary/15 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-tertiary transition-all duration-300 ease-out ${processing ? "animate-pulse" : ""}`}
                    style={{ width: `${processing ? 100 : progress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : file ? (
            <div className="flex flex-col items-center gap-3 transition-all duration-200">
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
                <UploadIcon size={32} className="text-secondary" />
              </div>
              <div>
                <p className="text-lg font-semibold text-primary mb-1">
                  {t('pl_upload_drop_title')}
                </p>
                <p className="text-sm text-secondary mb-6">
                  {t('pl_upload_drop_subtitle')}
                </p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  {t('pl_upload_btn_select')}
                </button>
                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setResult(null); setError(null); } }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {(file || result) && !uploading && (
          <FadeIn show className="flex items-center gap-3">
            {!result && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="btn-secondary py-2 text-sm"
              >
                {t('pl_upload_btn_replace')}
              </button>
            )}
            {!result && (
              <button
                type="submit"
                onClick={handleUpload}
                disabled={!canUpload}
                className="btn-primary py-2 text-sm inline-flex items-center gap-2 disabled:cursor-not-allowed"
              >
                {t('pl_upload_btn_submit')}
              </button>
            )}
            {result && (
              <button onClick={reset} className="btn-secondary text-sm py-2 px-4">
                {t('pl_upload_btn_again')}
              </button>
            )}
          </FadeIn>
        )}
        {uploading && (
          <div className="flex items-center gap-2 text-secondary text-sm px-1">
            <span className="w-3.5 h-3.5 border-2 border-secondary/30 border-t-tertiary rounded-full animate-spin shrink-0" />
            Mohon tunggu, jangan tutup halaman ini…
          </div>
        )}

        {/* Error */}
        <FadeIn show={!!error}>
          <div ref={errorRef} className="flex items-start gap-3 rounded-lg border border-rose-500/25 bg-rose-500/5 px-4 py-3.5 text-sm text-rose-600">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Upload gagal</p>
              <p className="text-rose-500/80">{error}</p>
            </div>
          </div>
        </FadeIn>

        {/* Result */}
        <FadeIn show={!!result}>
          {result && (
          <div ref={resultRef} className="card border border-secondary/20 rounded-lg overflow-hidden">
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

              {result.branches?.length > 0 && (
                <div className="pt-3 border-t border-secondary/10">
                  <p className="text-[0.72rem] uppercase tracking-wider font-semibold text-secondary mb-2">
                    Cabang & Kode Marking
                  </p>
                  <div className="space-y-1.5">
                    {result.branches.map((b) => (
                      <div key={b.branch} className="flex items-center gap-2">
                        <span className="badge bg-tertiary/10 text-tertiary border-tertiary/25">{b.branch}</span>
                        <span className="text-secondary text-xs">→</span>
                        {b.markingCode ? (
                          <span className="badge bg-secondary/10 text-secondary border-secondary/25">{b.markingCode}</span>
                        ) : (
                          <span className="text-[0.75rem] text-secondary italic opacity-70">tanpa marking</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
        </FadeIn>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
