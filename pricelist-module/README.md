# Modul Price List — Upload, Report & Dashboard

Modul ini dibuat untuk diintegrasikan ke WorkHub (Hono + Prisma + SQL Server + React/Tailwind),
untuk kebutuhan: upload file price list (.xlsx) → parsing otomatis → simpan ke SQL Server →
report perbandingan harga → dashboard tren harga per tanggal upload.

## Struktur file

```
prisma/schema.additions.prisma          → tambahan model Prisma
backend/src/services/priceListParser.ts → parser xlsx (fleksibel)
backend/src/services/priceList.service.ts → akses DB (Prisma)
backend/src/routes/priceList.routes.ts  → route Hono
frontend/src/pages/PriceList/*.tsx      → halaman upload, dashboard, riwayat, detail
```

## Langkah instalasi

### 1. Database

Salin isi `prisma/schema.additions.prisma` ke `schema.prisma` WorkHub yang sudah ada
(dua model baru: `PriceListUpload` dan `PriceListItem`, tidak menyentuh model lain).

```bash
npx prisma migrate dev --name add_price_list
npx prisma generate
```

### 2. Backend

```bash
npm install exceljs
```

Daftarkan route di entrypoint Hono (mis. `app.ts` / `index.ts`):

```ts
import { priceListRoutes } from "./routes/priceList.routes";
app.route("/api/pricelist", priceListRoutes);
```

Sambungkan RBAC yang sudah ada di WorkHub pada baris `requirePermission(...)` yang dikomentari
di `priceList.routes.ts` — pola ini disamakan dengan permission per sub-halaman yang sudah
dipakai di modul lain (mis. `roles.service.ts`).

### 3. Frontend

```bash
npm install recharts
```

Tambahkan route halaman (react-router atau sejenisnya, sesuaikan dengan router WorkHub):

```
/pricelist/upload      → PriceListUploadPage
/pricelist/dashboard   → PriceListDashboardPage
/pricelist/uploads     → PriceListHistoryPage
/pricelist/uploads/:id → PriceListDetailPage (pakai param id)
```

Class Tailwind di komponen ini pakai token warna `ink`, `limestone`, `rust` mengikuti Heritage
design system yang sudah ada. Kalau nama token di `tailwind.config` beda, tinggal cari-ganti
nama class-nya — struktur komponen tidak perlu diubah.

## Cara kerja parsing

File contoh (`pl.xlsx`) polanya: tiap sheet (CS, MKT) berisi blok "BY SEA*" / "BY AIR*",
diikuti baris tujuan (SG, HK, GZ, ...), baris estimasi waktu kirim, lalu baris-baris
kategori barang dengan harga per tujuan.

Karena diinfokan format bisa berubah-ubah antar upload, parser (`priceListParser.ts`) didesain
mendeteksi pola ini secara dinamis, bukan hardcode posisi cell:

- Kolom tujuan & kategori **tidak dihardcode** — dibaca apa adanya dari file, jadi kalau
  ada kategori baru atau tujuan baru, otomatis ikut tersimpan.
- Pola struktural yang **diasumsikan tetap**: satu blok diawali baris berisi teks yang diawali
  `"BY "` (mis. "BY SEA", "BY AIR"), diikuti baris tujuan, lalu baris-baris kategori sampai
  baris kosong. Ini pola paling stabil di file price list logistik semacam ini.
- Kalau sewaktu-waktu pola itu juga berubah, upload **tidak akan gagal total** — seluruh isi
  sheet mentah tetap disimpan di kolom `rawSnapshot` (JSON), status upload ditandai
  `PARTIAL`/`FAILED`, dan daftar `warnings` menjelaskan bagian mana yang tidak terbaca, supaya
  bisa dicek manual lalu (kalau perlu) parser disesuaikan lagi.

## Fitur yang tersedia

- **Upload**: drag-drop `.xlsx`, langsung parsing & simpan, preview hasil + warning.
- **Riwayat**: daftar semua upload dengan status, jumlah baris, siapa yang upload.
- **Detail/Report**: perbandingan harga upload ini vs upload sebelumnya (naik/turun/tetap/baru),
  bisa difilter "yang berubah saja".
- **Dashboard**: grafik tren harga per tanggal upload, filter by tipe (CS/MKT), mode (SEA/AIR),
  kategori barang, dipecah per garis per tujuan.

## Yang perlu disesuaikan manual

- Field `uploadedBy` di route upload — sesuaikan dengan cara WorkHub membaca user dari session/JWT.
- Import komponen UI (`Button`, `Card`, dll) — kalau WorkHub sudah punya shared component,
  ganti elemen HTML mentah di halaman-halaman ini dengan komponen tersebut.
- Nama route/path halaman — sesuaikan dengan konvensi routing WorkHub yang sudah ada.
