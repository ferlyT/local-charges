import { useCallback, useState } from "react";

// NOTE: sesuaikan import ini dengan komponen Heritage design system yang sudah
// ada di WorkHub (Button, Card, Badge, dsb). Di sini dipakai className Tailwind
// langsung dengan token warna ink/limestone/rust supaya tetap konsisten kalau
// komponen shared belum tersedia untuk halaman ini.

interface UploadResult {
  uploadId: number;
  status: "PARSED" | "PARTIAL" | "FAILED";
  priceDate: string | null;
  itemCount: number;
  warnings: string[];
}

const STATUS_STYLE: Record<UploadResult["status"], string> = {
  PARSED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-rust/10 text-rust border-rust/30",
};

export default function PriceListUploadPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/pricelist/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Upload gagal");
      }
      const data: UploadResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="font-[Fraunces] text-3xl text-ink mb-1">Upload Price List</h1>
      <p className="font-[Public_Sans] text-sm text-ink/60 mb-8">
        Upload file price list (.xlsx) untuk otomatis dibaca dan disimpan ke database.
        Data akan langsung muncul di dashboard dan riwayat harga.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
          dragging ? "border-rust bg-rust/5" : "border-ink/20 bg-limestone/40"
        }`}
      >
        <p className="font-[Public_Sans] text-ink/70 mb-3">
          {file ? (
            <span className="font-medium text-ink">{file.name}</span>
          ) : (
            "Tarik & lepas file .xlsx di sini, atau"
          )}
        </p>
        <label className="inline-block cursor-pointer rounded-md border border-ink/20 bg-white px-4 py-2 text-sm font-[Public_Sans] text-ink hover:border-rust hover:text-rust transition-colors">
          Pilih File
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="rounded-md bg-ink px-5 py-2.5 text-sm font-[Public_Sans] font-medium text-white disabled:opacity-40 hover:bg-ink/90 transition-colors"
        >
          {uploading ? "Memproses..." : "Upload & Proses"}
        </button>
        {file && !uploading && (
          <button
            onClick={() => {
              setFile(null);
              setResult(null);
              setError(null);
            }}
            className="text-sm font-[Public_Sans] text-ink/50 hover:text-ink"
          >
            Batal
          </button>
        )}
      </div>

      {error && (
        <div className="mt-6 rounded-md border border-rust/30 bg-rust/5 px-4 py-3 text-sm font-[Public_Sans] text-rust">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-lg border border-ink/10 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-[Space_Grotesk] text-xs uppercase tracking-wide text-ink/50">
              Upload #{result.uploadId}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full border font-[Public_Sans] ${STATUS_STYLE[result.status]}`}>
              {result.status}
            </span>
          </div>
          <p className="font-[Public_Sans] text-sm text-ink/80">
            {result.itemCount} baris harga berhasil dibaca
            {result.priceDate ? ` — tanggal price list: ${new Date(result.priceDate).toLocaleDateString("id-ID")}` : ""}.
          </p>
          {result.warnings.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-[Public_Sans] text-amber-700 mb-1">
                Perlu dicek manual ({result.warnings.length}):
              </p>
              <ul className="text-xs font-[Public_Sans] text-ink/60 list-disc list-inside space-y-0.5">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <a
            href={`/pricelist/uploads/${result.uploadId}`}
            className="inline-block mt-4 text-sm font-[Public_Sans] text-rust hover:underline"
          >
            Lihat detail upload →
          </a>
        </div>
      )}
    </div>
  );
}
