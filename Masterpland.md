# Masterplan: Aplikasi Web Form Local Charges (Executable Version)

## 1. Overview & Tujuan

Aplikasi web internal untuk **digitalisasi Form Local Charges** — menggantikan form kertas dengan sistem digital yang mendukung:

| # | Tujuan | Keterangan |
|---|---|---|
| 1 | **Input** | Isi form baru secara digital, multi-row detail |
| 2 | **Edit** | Ubah data form yang sudah tersimpan |
| 3 | **Upload Lampiran** | Attach foto/scan dokumen fisik (JPG, PNG, PDF) ke setiap form |
| 4 | **Display Lampiran** | Lihat, zoom, dan download lampiran yang sudah di-upload |
| 5 | **Pencarian Data** | Cari form berdasarkan nama customer, no. receipt, no. billing, tanggal, dll |

---

## 2. Analisis Form Fisik

### Header Form
| Field | Keterangan |
|---|---|
| To | Nama tujuan (contoh: BEN) |
| Sales SPW | Nama sales |
| QTY | Jumlah + satuan (contoh: 21.25 M3) |

### Tabel Detail (multi-row)
| Field | Contoh |
|---|---|
| No | 1, 2, 3, ... |
| Nama Customer | TUNAS ESA MANDIRI |
| Marking | 26EXA28 |
| No. Receipt | GZ-6011391 |
| No. Billing | (diisi billing) |
| Keterangan | BIAYA KIRIM KE GUDANG SHIPPER |
| No. Inputan | 0932689 |

### Footer Approval (5 kolom tanda tangan)
| Dibuat | Direquest | Billing | AR | Diketahui |
|---|---|---|---|---|
| Nama + Tgl | Nama + Tgl | Nama + Tgl | Nama + Tgl | Nama + Tgl |

---

## 3. Tech Stack

| Layer | Teknologi | Alasan |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Fast dev, type-safe |
| UI Library | shadcn/ui + Tailwind CSS | Komponen siap pakai, clean |
| State | Zustand | Ringan, mudah |
| Data Fetching | TanStack Query (React Query) | Cache + loading state otomatis |
| HTTP | Axios | Interceptor JWT, upload progress |
| Backend | Hono.js + Bun | Konsisten dengan stack Expo, performa tinggi |
| ORM | Drizzle ORM | Type-safe, SQL-first |
| Database | MS SQL Server | Existing infrastructure |
| Auth | JWT + bcrypt | Standard |
| File Storage | Lokal disk (server) → `uploads/` folder | Simple, tidak butuh cloud |
| PDF Print | Puppeteer (server-side) | Layout konsisten dengan form fisik |

---

## 4. Database Schema (MS SQL Server)

### 4.1 Tabel `tbLocalCharges` (Header Form)
```sql
CREATE TABLE tbLocalCharges (
  fdId            INT IDENTITY(1,1) PRIMARY KEY,
  fdNomorForm     VARCHAR(30)   NOT NULL UNIQUE,   -- auto: LC-YYYYMM-XXXX
  fdTo            VARCHAR(100)  NOT NULL,
  fdSalesSPW      VARCHAR(100),
  fdQty           DECIMAL(10,3),
  fdSatuanQty     VARCHAR(20)   DEFAULT 'M3',      -- M3, KG, CBM, dll
  fdStatus        TINYINT       NOT NULL DEFAULT 1,
  -- 1=Draft, 2=Direquest, 3=Billing, 4=AR, 5=Done
  fdDibuat        VARCHAR(100),
  fdTglDibuat     DATETIME,
  fdDirequest     VARCHAR(100),
  fdTglDirequest  DATETIME,
  fdBilling       VARCHAR(100),
  fdTglBilling    DATETIME,
  fdAR            VARCHAR(100),
  fdTglAR         DATETIME,
  fdDiketahui     VARCHAR(100),
  fdTglDiketahui  DATETIME,
  fdCreatedBy     INT           NOT NULL,           -- FK ke tbUsers
  fdCreatedAt     DATETIME      DEFAULT GETDATE(),
  fdUpdatedAt     DATETIME      DEFAULT GETDATE(),
  fdDeletedAt     DATETIME      NULL                -- soft delete
);
```

### 4.2 Tabel `tbLocalChargesDetail` (Baris Detail)
```sql
CREATE TABLE tbLocalChargesDetail (
  fdId              INT IDENTITY(1,1) PRIMARY KEY,
  fdLocalChargesId  INT           NOT NULL,
  fdNo              TINYINT       NOT NULL,          -- urutan baris
  fdNamaCustomer    VARCHAR(150)  NOT NULL,
  fdMarking         VARCHAR(100),
  fdNoReceipt       VARCHAR(100),
  fdNoBilling       VARCHAR(100),
  fdKeterangan      VARCHAR(500),
  fdNoInputan       VARCHAR(100),
  CONSTRAINT FK_LCD_LC FOREIGN KEY (fdLocalChargesId)
    REFERENCES tbLocalCharges(fdId) ON DELETE CASCADE
);
```

### 4.3 Tabel `tbLocalChargesLampiran` (File Attachment)
```sql
CREATE TABLE tbLocalChargesLampiran (
  fdId              INT IDENTITY(1,1) PRIMARY KEY,
  fdLocalChargesId  INT           NOT NULL,           -- FK ke tbLocalCharges
  fdNamaFile        VARCHAR(255)  NOT NULL,            -- nama original file
  fdNamaFileSimpan  VARCHAR(255)  NOT NULL,            -- nama file di disk (UUID-based)
  fdMimeType        VARCHAR(100)  NOT NULL,            -- image/jpeg, image/png, application/pdf
  fdUkuranBytes     BIGINT        NOT NULL,
  fdPath            VARCHAR(500)  NOT NULL,            -- path relatif: uploads/2026/06/xxx.jpg
  fdUploadedBy      INT           NOT NULL,            -- FK ke tbUsers
  fdUploadedAt      DATETIME      DEFAULT GETDATE(),
  fdKeterangan      VARCHAR(255),                      -- label opsional: "Foto fisik", "Scan TTD"
  CONSTRAINT FK_LCL_LC FOREIGN KEY (fdLocalChargesId)
    REFERENCES tbLocalCharges(fdId) ON DELETE CASCADE,
  CONSTRAINT FK_LCL_User FOREIGN KEY (fdUploadedBy)
    REFERENCES tbUsers(fdId)
);
```

### 4.4 Tabel `tbUsers`
```sql
CREATE TABLE tbUsers (
  fdId        INT IDENTITY(1,1) PRIMARY KEY,
  fdNama      VARCHAR(100)  NOT NULL,
  fdUsername  VARCHAR(50)   NOT NULL UNIQUE,
  fdPassword  VARCHAR(255)  NOT NULL,                 -- bcrypt hash
  fdRole      VARCHAR(30)   NOT NULL DEFAULT 'user',
  -- roles: admin, user, billing, ar, diketahui
  fdAktif     BIT           DEFAULT 1,
  fdCreatedAt DATETIME      DEFAULT GETDATE()
);
```

---

## 5. Sistem Lampiran (File Attachment) — Detail

### 5.1 Aturan Upload
| Parameter | Nilai |
|---|---|
| Tipe file diterima | JPG, JPEG, PNG, PDF |
| Ukuran maks per file | 10 MB |
| Jumlah file per form | Maksimal 20 file |
| Naming strategy | `{UUID}-{timestamp}.{ext}` — hindari collision |
| Organisasi folder | `uploads/{YYYY}/{MM}/{fdLocalChargesId}/` |

### 5.2 Alur Upload
```
User pilih file di browser
  → Frontend validasi tipe & ukuran (client-side)
  → POST /api/v1/local-charges/:id/lampiran
     dengan multipart/form-data
  → Backend (Multer/Hono multipart):
       - Validasi ulang tipe & ukuran
       - Rename file → UUID + ext
       - Simpan ke disk: uploads/YYYY/MM/formId/
       - Insert ke tbLocalChargesLampiran
  → Response: { id, namaFile, url, mimeType, ukuranBytes }
  → Frontend update daftar lampiran tanpa reload halaman
```

### 5.3 Alur Display Lampiran
```
GET /api/v1/local-charges/:id → include array `lampiran[]`

Frontend render daftar lampiran:
  - Thumbnail untuk gambar (JPG/PNG) → <img src="/api/v1/files/{namaFileSimpan}">
  - Icon PDF untuk file PDF
  - Klik gambar → Lightbox/modal full-screen
  - Klik PDF → buka tab baru atau inline PDF viewer
  - Tombol download per file
  - Tombol hapus (dengan konfirmasi)
```

### 5.4 Served File Endpoint
```
GET  /api/v1/files/:filename
  → Stream file dari disk
  → Set Content-Type sesuai mimeType
  → Set Content-Disposition: inline (untuk preview) atau attachment (untuk download)
  → Wajib auth JWT (file tidak boleh diakses publik)
```

---

## 6. API Endpoints Lengkap

Base URL: `/api/v1`

### Auth
```
POST  /auth/login          Body: { username, password } → { token, user }
POST  /auth/logout
GET   /auth/me
```

### Local Charges — CRUD
```
GET   /local-charges
      Query params:
        search=<string>      cari di: namaCustomer, noReceipt, noBilling, nomorForm, to
        status=<1-5>         filter status
        dateFrom=<YYYY-MM-DD>
        dateTo=<YYYY-MM-DD>
        salesSpw=<string>
        page=<int>           default 1
        limit=<int>          default 20

GET   /local-charges/:id    Detail form + semua detail rows + semua lampiran

POST  /local-charges        Buat form baru
      Body: {
        to, salesSpw, qty, satuanQty,
        dibuat, tglDibuat,
        details: [{ namaCustomer, marking, noReceipt, noBilling, keterangan, noInputan }]
      }

PUT   /local-charges/:id    Update header + detail rows (replace semua detail)
      Body: { to, salesSpw, qty, satuanQty, dibuat, tglDibuat, details: [...] }

DELETE /local-charges/:id   Soft delete (set fdDeletedAt)
```

### Local Charges — Approval
```
POST  /local-charges/:id/approve
      Body: { step: 'direquest'|'billing'|'ar'|'diketahui', nama: string }
```

### Lampiran
```
POST   /local-charges/:id/lampiran
       Content-Type: multipart/form-data
       Fields: file (binary), keterangan (optional string)
       Response: { id, namaFile, url, mimeType, ukuranBytes, uploadedAt }

GET    /local-charges/:id/lampiran          List semua lampiran form ini

DELETE /local-charges/:id/lampiran/:lampiranId   Hapus lampiran
       → hapus record DB + hapus file dari disk

GET    /files/:filename                     Serve file (auth required)
GET    /files/:filename?download=1          Force download
```

### Search (dedicated)
```
GET   /search?q=<string>&type=<all|customer|receipt|billing|form>
      → Full-text search lintas field, return matched forms + highlight field mana yang cocok
      → Hasil: [{ fdId, fdNomorForm, fdTo, matchedField, matchedValue, ... }]
```

### Users (Admin)
```
GET    /users
POST   /users
PUT    /users/:id
DELETE /users/:id
```

---

## 7. Pencarian Data — Detail

### 7.1 Field yang bisa dicari
| Field | Tabel | Contoh |
|---|---|---|
| No. Form | tbLocalCharges.fdNomorForm | LC-202606-0001 |
| To | tbLocalCharges.fdTo | BEN |
| Sales SPW | tbLocalCharges.fdSalesSPW | MARRY |
| Nama Customer | tbLocalChargesDetail.fdNamaCustomer | TUNAS ESA |
| Marking | tbLocalChargesDetail.fdMarking | 26EXA28 |
| No. Receipt | tbLocalChargesDetail.fdNoReceipt | GZ-6011391 |
| No. Billing | tbLocalChargesDetail.fdNoBilling | |
| No. Inputan | tbLocalChargesDetail.fdNoInputan | 0932689 |
| Keterangan | tbLocalChargesDetail.fdKeterangan | GUDANG SHIPPER |

### 7.2 SQL Pattern Pencarian
```sql
-- Search dengan JOIN ke detail
SELECT DISTINCT
  h.fdId, h.fdNomorForm, h.fdTo, h.fdSalesSPW,
  h.fdQty, h.fdSatuanQty, h.fdStatus, h.fdCreatedAt
FROM tbLocalCharges h
LEFT JOIN tbLocalChargesDetail d ON d.fdLocalChargesId = h.fdId
WHERE h.fdDeletedAt IS NULL
  AND (
    h.fdNomorForm   LIKE '%' + @q + '%' OR
    h.fdTo          LIKE '%' + @q + '%' OR
    h.fdSalesSPW    LIKE '%' + @q + '%' OR
    d.fdNamaCustomer LIKE '%' + @q + '%' OR
    d.fdMarking     LIKE '%' + @q + '%' OR
    d.fdNoReceipt   LIKE '%' + @q + '%' OR
    d.fdNoBilling   LIKE '%' + @q + '%' OR
    d.fdNoInputan   LIKE '%' + @q + '%' OR
    d.fdKeterangan  LIKE '%' + @q + '%'
  )
ORDER BY h.fdCreatedAt DESC
OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
```

### 7.3 UI Pencarian
- **Search bar global** di navbar: ketik → debounce 300ms → live results
- **Filter panel** di halaman list:
  - Date range (Dari - Sampai)
  - Status (multi-select badge)
  - Sales SPW (dropdown dari data existing)
- **Highlight** teks yang cocok di hasil pencarian
- **URL-based search**: `?search=GZ-601&status=1,2` → shareable & browser back-aware

---

## 8. Struktur Project

```
local-charges-app/
│
├── backend/                          # Hono.js + Bun
│   ├── src/
│   │   ├── index.ts                  # entry point, setup Hono app
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── localCharges.ts
│   │   │   ├── lampiran.ts           # upload & serve file
│   │   │   ├── search.ts
│   │   │   └── users.ts
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── localChargesController.ts
│   │   │   ├── lampiranController.ts
│   │   │   └── searchController.ts
│   │   ├── db/
│   │   │   ├── connection.ts         # mssql pool setup
│   │   │   ├── schema.ts             # Drizzle schema (semua tabel)
│   │   │   └── migrations/           # SQL migration files
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT verify middleware
│   │   │   └── upload.ts             # Multer / Hono multipart config
│   │   ├── services/
│   │   │   ├── formNumberService.ts  # generate LC-YYYYMM-XXXX
│   │   │   ├── fileService.ts        # simpan, hapus, serve file
│   │   │   └── pdfService.ts         # puppeteer print to PDF
│   │   └── utils/
│   │       └── validators.ts
│   ├── uploads/                      # file storage (gitignored)
│   │   └── 2026/06/{formId}/
│   ├── package.json
│   └── .env
│
└── frontend/                         # React + Vite + TypeScript
    ├── src/
    │   ├── components/
    │   │   ├── ui/                   # shadcn/ui base components
    │   │   ├── form/
    │   │   │   ├── HeaderSection.tsx       # To, Sales, QTY
    │   │   │   ├── DetailTable.tsx         # Dynamic rows
    │   │   │   └── ApprovalFooter.tsx      # 5 kolom TTD
    │   │   ├── lampiran/
    │   │   │   ├── LampiranUploader.tsx    # drag & drop / file picker
    │   │   │   ├── LampiranGrid.tsx        # thumbnail grid display
    │   │   │   ├── LampiranLightbox.tsx    # modal full-screen viewer
    │   │   │   └── LampiranItem.tsx        # single file card
    │   │   ├── search/
    │   │   │   ├── GlobalSearchBar.tsx     # navbar search
    │   │   │   └── FilterPanel.tsx         # date, status, sales filter
    │   │   └── layout/
    │   │       ├── AppLayout.tsx
    │   │       ├── Navbar.tsx
    │   │       └── Sidebar.tsx
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── DashboardPage.tsx           # list + search + filter
    │   │   ├── CreateFormPage.tsx          # form input baru
    │   │   ├── EditFormPage.tsx            # edit existing form
    │   │   └── DetailFormPage.tsx          # view + lampiran + approve + print
    │   ├── hooks/
    │   │   ├── useLocalCharges.ts
    │   │   ├── useLampiran.ts
    │   │   ├── useSearch.ts
    │   │   └── useAuth.ts
    │   ├── stores/
    │   │   └── authStore.ts               # Zustand: user session
    │   ├── lib/
    │   │   ├── api.ts                     # Axios instance + interceptors
    │   │   └── utils.ts
    │   └── App.tsx
    ├── package.json
    └── vite.config.ts
```

---

## 9. UI/UX Screens

### 9.1 Dashboard / List Form
```
┌─────────────────────────────────────────────────────────┐
│ [🔍 Cari customer, no. receipt, no. form...]   [+ Buat] │
├─────────────────────────────────────────────────────────┤
│ Filter: [Semua Status ▼] [Dari] [Sampai] [Sales ▼]      │
├──────────┬───────┬───────┬────────┬──────────┬──────────┤
│ No. Form │ To    │ Sales │ QTY    │ Status   │ Aksi     │
├──────────┼───────┼───────┼────────┼──────────┼──────────┤
│LC-202606 │ BEN   │ MARRY │21.25 M3│ ●Draft   │ 👁 ✏ 🗑  │
│LC-202606 │ ANDI  │ ANDRI │ 5 KG   │ ●Billing │ 👁 ✏    │
└──────────┴───────┴───────┴────────┴──────────┴──────────┘
  Showing 1-20 of 85   [< 1 2 3 4 5 >]
```

### 9.2 Form Input / Edit
```
┌─ FORM LOCAL CHARGES ───────────────────────────────────┐
│                          No. Form: LC-202606-0001 [auto]│
│  To: [___________]  Sales SPW: [_______]               │
│  QTY: [______] [M3 ▼]                                  │
├─────────────────────────────────────────────────────────┤
│ DETAIL                                    [+ Tambah Row]│
│ No │ Nama Customer │ Marking │ No.Resi │ Billing │ Ket  │
│  1 │ [__________]  │ [_____] │ [_____] │ [_____] │ [__] │
│  2 │ [__________]  │ [_____] │ [_____] │ [_____] │ [__] │
│                                                    [🗑] │
├─────────────────────────────────────────────────────────┤
│ LAMPIRAN                                                │
│ [📎 Upload File (JPG, PNG, PDF, maks 10MB)]             │
│                                                         │
│ ┌──────┐ ┌──────┐ ┌──────┐                             │
│ │[IMG] │ │[IMG] │ │[PDF] │                             │
│ │foto1 │ │foto2 │ │doc.pd│                             │
│ └──────┘ └──────┘ └──────┘                             │
├─────────────────────────────────────────────────────────┤
│ DIBUAT: [_______]  Tgl: [_________]                    │
├─────────────────────────────────────────────────────────┤
│                      [Batal]  [Simpan Draft]            │
└─────────────────────────────────────────────────────────┘
```

### 9.3 Detail View + Lampiran Viewer
```
┌─ LC-202606-0001 ───────────────── [✏ Edit] [🖨 Print] ─┐
│  To: BEN    Sales: MARRY    QTY: 21.25 M3               │
│  Status: ● Draft                                        │
├─────────────────────────────────────────────────────────┤
│ No │ Nama Customer      │ Marking  │ No. Resi  │ ...    │
│  1 │ TUNAS ESA MANDIRI  │ 26EXA28  │ GZ-601139 │ ...    │
├─────────────────────────────────────────────────────────┤
│ LAMPIRAN (3 file)                      [+ Upload Lagi]  │
│                                                         │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│ │          │  │          │  │  📄 PDF  │               │
│ │  [foto]  │  │  [foto]  │  │  doc.pdf │               │
│ │ foto1.jpg│  │ foto2.png│  │          │               │
│ │[👁][⬇][🗑]│  │[👁][⬇][🗑]│  │[👁][⬇][🗑]│               │
│ └──────────┘  └──────────┘  └──────────┘               │
├─────────────────────────────────────────────────────────┤
│ APPROVAL                                                │
│ Dibuat      Direquest    Billing     AR       Diketahui │
│ MARRY       ANDRI        -           -        -         │
│ 23/06/2026  23/06/2026                                  │
│             [✓ Approve Billing]                         │
└─────────────────────────────────────────────────────────┘
```

### 9.4 Lightbox / Image Viewer
- Klik thumbnail → modal full-screen
- Navigasi ← → antar lampiran
- Zoom in/out (pinch di mobile)
- Tombol download + tutup (X)
- PDF: ditampilkan via `<iframe>` atau buka tab baru

---

## 10. Environment Variables (Backend)

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DB_SERVER=localhost
DB_DATABASE=LogistikDB
DB_USER=sa
DB_PASSWORD=yourpassword
DB_PORT=1433

# Auth
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRES_IN=8h

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
MAX_FILES_PER_FORM=20
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/jpg,application/pdf

# CORS
FRONTEND_URL=http://localhost:5173
```

---

## 11. Panduan Implementasi Step-by-Step

Bagian ini dirancang untuk dieksekusi secara linear. Setiap task memiliki file spesifik, checklist instruksi, dan kriteria sukses yang dapat diuji.

### Phase 1: Setup Proyek, Database, & Autentikasi

#### Task 1.1: Setup Proyek & Konfigurasi Workspace
* **Tujuan**: Menginisialisasi environment frontend dan backend dengan dependency yang benar.
* **File Terkait**:
  * `backend/package.json`
  * `frontend/package.json`
  * `backend/.env`
  * `backend/tsconfig.json`
* **Checklist**:
  - [ ] Buat folder proyek `backend/` dan jalankan `bun init`.
  - [ ] Install dependency backend: `hono`, `@hono/node-server`, `drizzle-orm`, `tarn` (connection pooling), `mssql` atau `tedious`, `jsonwebtoken`, `bcrypt`, `zod` untuk validasi.
  - [ ] Install devDependency backend: `drizzle-kit`, `typescript`, `@types/jsonwebtoken`, `@types/bcrypt`, `@types/node`.
  - [ ] Buat folder proyek `frontend/` menggunakan Vite: `npm create vite@latest frontend -- --template react-ts`.
  - [ ] Install dependency frontend: `tailwindcss`, `postcss`, `autoprefixer`, `lucide-react`, `zustand`, `@tanstack/react-query`, `axios`.
  - [ ] Setup dan inisialisasi shadcn/ui di frontend (`npx shadcn-ui@latest init`).
  - [ ] Buat file `.env` di backend berdasarkan template Section 10.
* **Kriteria Sukses**:
  - [ ] Server backend dapat dijalankan (`bun run src/index.ts`) dan mengembalikan respons di port `3001`.
  - [ ] Halaman frontend Vite default dapat dimuat di browser (`npm run dev`) pada port `5173`.
  - [ ] Linter tidak menunjukkan error konfigurasi TypeScript pada kedua sisi.

#### Task 1.2: Database Schema & Migrasi Drizzle ORM
* **Tujuan**: Membuat skema database relasional di MS SQL Server sesuai rancangan tabel.
* **File Terkait**:
  * `backend/src/db/schema.ts`
  * `backend/src/db/connection.ts`
  * `backend/drizzle.config.ts`
* **Checklist**:
  - [ ] Setup file koneksi database `connection.ts` menggunakan pool connection driver MS SQL Server.
  - [ ] Tulis skema Drizzle di `schema.ts` untuk memetakan tabel `tbUsers`, `tbLocalCharges`, `tbLocalChargesDetail`, dan `tbLocalChargesLampiran` lengkap dengan relasi Foreign Key dan Cascade behavior.
  - [ ] Buat konfigurasi `drizzle.config.ts` mengarah ke MS SQL Server.
  - [ ] Jalankan command `bunx drizzle-kit generate` untuk menghasilkan migrasi SQL.
  - [ ] Jalankan command `bunx drizzle-kit migrate` untuk menerapkan skema ke database SQL Server.
  - [ ] Buat skrip seeder sederhana untuk memasukkan 1 user admin default ke `tbUsers` dengan password yang sudah di-hash menggunakan `bcrypt`.
* **Kriteria Sukses**:
  - [ ] Tabel `tbUsers`, `tbLocalCharges`, `tbLocalChargesDetail`, dan `tbLocalChargesLampiran` sukses dibuat di MS SQL Server database.
  - [ ] Kolom bertipe `IDENTITY` dan foreign key constraint terdefinisi dengan benar di database console.
  - [ ] User admin default berhasil masuk ke tabel `tbUsers`.

#### Task 1.3: API Autentikasi (Backend)
* **Tujuan**: Membuat REST API autentikasi menggunakan JWT token untuk memproteksi endpoint.
* **File Terkait**:
  * `backend/src/routes/auth.ts`
  * `backend/src/controllers/authController.ts`
  * `backend/src/middleware/auth.ts`
* **Checklist**:
  - [ ] Tulis controller login: verifikasi username, bandingkan password bcrypt hash, generate JWT token dengan payload user ID, nama, username, dan role.
  - [ ] Tulis route login: `POST /api/v1/auth/login`.
  - [ ] Buat middleware `auth.ts` untuk memvalidasi token JWT dari HTTP header `Authorization: Bearer <token>`. Jika valid, simpan data user ke context Hono (`c.set('user', user)`). Jika tidak, kembalikan response status `401`.
  - [ ] Tulis route `GET /api/v1/auth/me` yang diproteksi oleh middleware auth untuk mengembalikan data user yang sedang login.
* **Kriteria Sukses**:
  - [ ] Request `POST /api/v1/auth/login` dengan username/password yang salah mengembalikan HTTP `401`.
  - [ ] Request `POST /api/v1/auth/login` dengan kredensial benar mengembalikan JSON berisi `token` dan objek `user`.
  - [ ] Request `GET /api/v1/auth/me` tanpa header Authorization mengembalikan `401 Unauthorized`.
  - [ ] Request `GET /api/v1/auth/me` dengan token valid mengembalikan data user login dengan HTTP `200`.

#### Task 1.4: State Store, API Wrapper, & Login UI (Frontend)
* **Tujuan**: Membuat sistem penyimpanan session auth di client-side, interseptor API, dan form login.
* **File Terkait**:
  * `frontend/src/stores/authStore.ts`
  * `frontend/src/lib/api.ts`
  * `frontend/src/pages/LoginPage.tsx`
* **Checklist**:
  - [ ] Buat store `authStore` menggunakan Zustand untuk menyimpan `token`, `user`, status `isAuthenticated`, serta fungsi `login(token, user)` dan `logout()`. Simpan token ke `localStorage` agar persisten.
  - [ ] Konfigurasi Axios instance di `lib/api.ts` dengan request interceptor yang otomatis menambahkan header `Authorization: Bearer <token>` dari store jika token ada.
  - [ ] Tambahkan response interceptor di Axios yang mendeteksi error HTTP `401` dan otomatis mentrigger fungsi `logout()` di store serta redirect ke `/login`.
  - [ ] Buat halaman `LoginPage.tsx` menggunakan form shadcn/ui dengan validasi field username & password.
* **Kriteria Sukses**:
  - [ ] Submit form login memicu API login, menyimpan data token ke localStorage, dan mengubah state global `isAuthenticated` menjadi true.
  - [ ] Setelah login berhasil, aplikasi otomatis mengalihkan router user ke halaman Dashboard.
  - [ ] Jika token kedaluwarsa (API mengembalikan 401), client-side state otomatis ter-reset ke kondisi logout dan kembali ke halaman login.

#### Task 1.5: API CRUD Local Charges (Backend)
* **Tujuan**: Menyediakan endpoint CRUD data form Local Charges secara aman.
* **File Terkait**:
  * `backend/src/routes/localCharges.ts`
  * `backend/src/controllers/localChargesController.ts`
  * `backend/src/services/formNumberService.ts`
* **Checklist**:
  - [ ] Implementasikan `formNumberService.ts` untuk mengenerate format nomor form `LC-YYYYMM-XXXX` (gunakan transaksi SQL/Drizzle lock agar tidak ada duplikasi nomor saat request tinggi).
  - [ ] Implementasikan `POST /api/v1/local-charges`:
    - Jalankan DB transaction.
    - Dapatkan nomor form baru.
    - Insert header form ke `tbLocalCharges` (simpan ID pembuat ke `fdCreatedBy`).
    - Map dan insert detail rows ke `tbLocalChargesDetail`.
  - [ ] Implementasikan `GET /api/v1/local-charges/:id` untuk mengambil data header beserta array detil rows dan lampirannya.
  - [ ] Implementasikan `PUT /api/v1/local-charges/:id`:
    - Validasi status form (jika status > 1 / bukan draft, batasi edit atau sesuai role).
    - Hapus data detail lama di `tbLocalChargesDetail` lalu insert detail yang baru dikirim (dalam satu transaksi).
  - [ ] Implementasikan `DELETE /api/v1/local-charges/:id` untuk melakukan soft delete dengan mengisi kolom `fdDeletedAt`.
* **Kriteria Sukses**:
  - [ ] Request `POST` berhasil menyimpan data baru ke 2 tabel (`tbLocalCharges` & `tbLocalChargesDetail`) dan nomor form bertambah secara berurutan.
  - [ ] Request `GET` detail mengembalikan struktur data JSON lengkap dengan detail dan relasi lampiran.
  - [ ] Request `DELETE` tidak menghapus baris database secara fisik, melainkan hanya mengisi kolom `fdDeletedAt` dengan timestamp saat ini.

#### Task 1.6: Dashboard Halaman List Form (Frontend)
* **Tujuan**: Menampilkan data form Local Charges dengan pagination dasar.
* **File Terkait**:
  * `frontend/src/pages/DashboardPage.tsx`
  * `frontend/src/hooks/useLocalCharges.ts`
  * `frontend/src/components/layout/AppLayout.tsx`
* **Checklist**:
  - [ ] Buat template layout (`AppLayout.tsx`, `Navbar.tsx`, `Sidebar.tsx`) dengan desain premium menggunakan shadcn/ui.
  - [ ] Buat hook `useLocalCharges.ts` menggunakan TanStack Query untuk fetching paginated list dari backend `GET /api/v1/local-charges`.
  - [ ] Tampilkan list form di `DashboardPage.tsx` menggunakan komponen Table dari shadcn.
  - [ ] Implementasikan kontrol pagination (Previous, Next, Page Numbers).
* **Kriteria Sukses**:
  - [ ] Halaman Dashboard menampilkan daftar Local Charges sesuai data di database.
  - [ ] Loader skeleton muncul selama proses fetching.
  - [ ] Mengklik tombol page 2 mengirimkan request dengan query param `page=2` dan merender data baru.

---

### Phase 2: Sistem Lampiran (File Attachment)

#### Task 2.1: API Upload Lampiran (Backend)
* **Tujuan**: Menangani upload file multipart form-data, validasi tipe/ukuran, dan penyimpanan terstruktur.
* **File Terkait**:
  * `backend/src/routes/lampiran.ts`
  * `backend/src/controllers/lampiranController.ts`
  * `backend/src/middleware/upload.ts`
  * `backend/src/services/fileService.ts`
* **Checklist**:
  - [ ] Buat middleware `upload.ts` menggunakan parser multipart (seperti busboy atau standard Hono multipart parser) untuk mengekstrak file buffer.
  - [ ] Implementasikan logic `fileService.ts`:
    - Validasi ukuran file (maksimal 10MB).
    - Validasi MIME type: hanya izinkan `image/jpeg`, `image/png`, `application/pdf`.
    - Generate nama file simpan unik menggunakan UUID: `{UUID}-{timestamp}.{ext}`.
    - Tentukan lokasi direktori penyimpanan: `uploads/{YYYY}/{MM}/{fdLocalChargesId}/`. Buat direktori secara rekursif jika belum ada.
    - Simpan file fisik ke disk server.
  - [ ] Implementasikan endpoint `POST /api/v1/local-charges/:id/lampiran`:
    - Ambil user ID dari auth middleware context.
    - Panggil file service untuk menyimpan file.
    - Lakukan insert record data lampiran ke tabel `tbLocalChargesLampiran`.
* **Kriteria Sukses**:
  - [ ] Upload file selain JPG/PNG/PDF mengembalikan HTTP `400 Bad Request`.
  - [ ] Upload file berukuran > 10MB ditolak dan mengembalikan pesan error yang jelas.
  - [ ] Upload file valid berhasil mengembalikan status `201` dan file tersimpan di disk server pada path folder yang terstruktur dengan nama acak (UUID).

#### Task 2.2: API Serve File & Delete Lampiran (Backend)
* **Tujuan**: Menyajikan file secara aman ke user terautentikasi dan mengizinkan penghapusan berkas.
* **File Terkait**:
  * `backend/src/routes/lampiran.ts`
  * `backend/src/controllers/lampiranController.ts`
* **Checklist**:
  - [ ] Tulis endpoint `GET /api/v1/files/:filename`:
    - Wajibkan otentikasi JWT (jangan biarkan endpoint ini bisa diakses anonim).
    - Ambil path file dari record di database berdasarkan `:filename`.
    - Set header `Content-Type` sesuai MIME type yang tersimpan di DB.
    - Jika terdapat parameter query `download=1`, set header `Content-Disposition: attachment; filename="..."`. Jika tidak, set `Content-Disposition: inline`.
    - Stream file fisik dari disk dan kirim ke response client.
  - [ ] Tulis endpoint `DELETE /api/v1/local-charges/:id/lampiran/:lampiranId`:
    - Tarik record lampiran berdasarkan ID.
    - Hapus file fisik dari disk server.
    - Hapus baris record di tabel `tbLocalChargesLampiran` menggunakan transaksi.
* **Kriteria Sukses**:
  - [ ] Mengakses url file secara langsung di browser tanpa header Authorization memicu error `401`.
  - [ ] Request file dengan token JWT yang valid mengembalikan data gambar atau dokumen PDF secara langsung di tab browser.
  - [ ] Request hapus menghapus data di database serta melenyapkan file fisik dari sistem penyimpanan disk server.

#### Task 2.3: Komponen Frontend Lampiran Uploader
* **Tujuan**: Membuat UI drag-and-drop untuk upload file dengan progress bar interaktif.
* **File Terkait**:
  * `frontend/src/components/lampiran/LampiranUploader.tsx`
  * `frontend/src/hooks/useLampiran.ts`
* **Checklist**:
  - [ ] Buat drag-and-drop area menggunakan Tailwind. Tambahkan feedback visual (outline berubah warna/putus-putus) saat file diseret di atas area uploader.
  - [ ] Implementasikan validasi tipe file dan ukuran pada client-side sebelum request dikirim.
  - [ ] Panggil fungsi API upload menggunakan Axios multipart request.
  - [ ] Ambil metrik upload progress menggunakan opsi `onUploadProgress` pada Axios dan tampilkan persentase progress bar secara real-time di UI.
  - [ ] Trigger refresh list lampiran setelah upload selesai.
* **Kriteria Sukses**:
  - [ ] Menyeret file yang tidak didukung (misal `.zip` atau `.docx`) memunculkan pesan error toast visual di frontend dan membatalkan upload.
  - [ ] Progress bar naik secara bertahap dari 0% hingga 100% saat proses upload berjalan.
  - [ ] Toast pemberitahuan sukses muncul setelah file berhasil diunggah ke backend.

#### Task 2.4: Komponen Frontend Grid Lampiran & Viewer Lightbox
* **Tujuan**: Menampilkan preview lampiran dan navigasi media full-screen.
* **File Terkait**:
  * `frontend/src/components/lampiran/LampiranGrid.tsx`
  * `frontend/src/components/lampiran/LampiranItem.tsx`
  * `frontend/src/components/lampiran/LampiranLightbox.tsx`
* **Checklist**:
  - [ ] Buat grid layout untuk merender daftar lampiran.
  - [ ] Jika lampiran berupa gambar (MIME `image/*`), render thumbnail menggunakan path API `GET /api/v1/files/:filename` terproteksi JWT.
  - [ ] Jika lampiran berupa PDF, render icon PDF besar yang informatif.
  - [ ] Sediakan tombol preview (ikon mata), download (ikon unduh), dan hapus (ikon sampah dengan dialog konfirmasi) pada setiap item lampiran.
  - [ ] Buat modal full-screen `LampiranLightbox.tsx` untuk menampilkan gambar resolusi penuh. Tambahkan tombol panah kiri-kanan untuk berpindah antar gambar secara cepat tanpa menutup modal.
  - [ ] Untuk preview PDF, buka dokumen di tab baru dengan parameter inline, atau gunakan tag `<iframe>` di dalam modal.
* **Kriteria Sukses**:
  - [ ] Thumbnail gambar termuat dengan benar menggunakan token otentikasi.
  - [ ] Mengklik ikon mata pada gambar membuka modal full-screen lightbox. Navigasi keyboard (panah kiri/kanan/Esc) berfungsi dengan lancar.
  - [ ] Mengklik tombol hapus memicu modal konfirmasi shadcn/ui. Jika dikonfirmasi, item menghilang secara instan dari grid list.

---

### Phase 3: Pencarian & Filtering Optimal

#### Task 3.1: Optimal Search Query & Indexing (MS SQL)
* **Tujuan**: Mengoptimalkan kueri pencarian database SQL Server menggunakan JOIN dan indeks yang tepat.
* **File Terkait**:
  * `backend/src/db/migrations/` (Migration file baru untuk indeks)
  * `backend/src/controllers/localChargesController.ts`
* **Checklist**:
  - [ ] Buat file migrasi SQL baru untuk membuat database index pada kolom-kolom kritis:
    - `IX_LCD_NamaCustomer` pada `tbLocalChargesDetail(fdNamaCustomer)`
    - `IX_LCD_NoReceipt` pada `tbLocalChargesDetail(fdNoReceipt)`
    - `IX_LC_Status` pada `tbLocalCharges(fdStatus)`
    - `IX_LC_CreatedAt` pada `tbLocalCharges(fdCreatedAt)`
  - [ ] Implementasikan optimasi query pencarian menggunakan LEFT JOIN antara `tbLocalCharges` dan `tbLocalChargesDetail` dengan logika pencarian multi-kolom (LIKE case-insensitive) seperti pada Section 7.2.
  - [ ] Gunakan `DISTINCT` agar data header tidak duplikat jika ada beberapa detail row yang cocok dengan kata kunci pencarian.
* **Kriteria Sukses**:
  - [ ] Indeks database sukses diterapkan di MS SQL Server.
  - [ ] Kueri SQL berjalan efisien (periksa query execution plan jika memungkinkan) dan tidak mengalami error timeout.
  - [ ] Pencarian kata kunci "TUNAS" berhasil menampilkan baris form terkait tanpa menduplikasi data form di list hasil pencarian.

#### Task 3.2: Dedicated Search API & Highlighting
* **Tujuan**: Menyediakan API pencarian khusus yang memberitahukan field mana yang cocok beserta highlight nilai.
* **File Terkait**:
  * `backend/src/routes/search.ts`
  * `backend/src/controllers/searchController.ts`
* **Checklist**:
  - [ ] Buat endpoint `GET /api/v1/search?q=<keyword>&type=<type>`.
  - [ ] Lakukan pencarian lintas tabel.
  - [ ] Untuk setiap data form yang cocok, cari field mana yang memicu kecocokan (misalnya `fdNamaCustomer` atau `fdNoReceipt`) dan simpan nama field beserta nilainya ke response object (`matchedField` dan `matchedValue`).
* **Kriteria Sukses**:
  - [ ] Request `GET /api/v1/search?q=GZ-601` mengembalikan array object dengan metadata yang jelas, seperti:
    `[{ "fdId": 1, "fdNomorForm": "LC-202606-0001", "matchedField": "fdNoReceipt", "matchedValue": "GZ-6011391" }]`.

#### Task 3.3: UI Search & Filter Interaktif (Frontend)
* **Tujuan**: Menghubungkan kolom pencarian navbar dan panel filter dengan URL state.
* **File Terkait**:
  * `frontend/src/components/search/GlobalSearchBar.tsx`
  * `frontend/src/components/search/FilterPanel.tsx`
  * `frontend/src/pages/DashboardPage.tsx`
* **Checklist**:
  - [ ] Buat `GlobalSearchBar.tsx` di navbar menggunakan input field shadcn/ui.
  - [ ] Terapkan teknik debounce 300ms pada input search menggunakan custom hook atau helper library agar tidak membebani server saat mengetik.
  - [ ] Buat `FilterPanel.tsx` yang berisi input Date Range Picker (Dari - Sampai), opsi dropdown Sales SPW, dan checkbox multi-select status form.
  - [ ] Sinkronisasikan state pencarian & filter ke URL search parameters (contoh: `?q=tunas&status=1,2&dateFrom=2026-06-01`).
  - [ ] Gunakan URL search params tersebut sebagai query key di TanStack Query agar UI otomatis me-refresh data saat parameter URL berubah.
* **Kriteria Sukses**:
  - [ ] Pengguna mengetik di kolom pencarian, URL berubah setelah 300ms jeda ketikan, dan list data terupdate secara otomatis.
  - [ ] Membagikan link url `http://localhost:5173/?q=GZ-601&status=1` ke browser lain langsung memuat halaman dengan filter pencarian yang sama persis secara instan.
  - [ ] Teks yang cocok dengan kata kunci pencarian ditandai dengan warna background kuning stabilo (`<mark>` tag) pada tabel.

---

### Phase 4: Cetak PDF, Approval Workflow, & Polish

#### Task 4.1: Engine Cetak PDF Server-Side (Backend)
* **Tujuan**: Merender tampilan detail form ke dokumen PDF beresolusi tinggi dengan Puppeteer.
* **File Terkait**:
  * `backend/src/services/pdfService.ts`
  * `backend/src/routes/localCharges.ts`
* **Checklist**:
  - [ ] Install Puppeteer (`bun add puppeteer`).
  - [ ] Buat modul layout HTML khusus dalam program (atau template engine) yang memformat data form agar identik dengan visual kertas form fisik asli (Header, detail table, signature box footer).
  - [ ] Implementasikan fungsi print di `pdfService.ts`:
    - Jalankan headless browser Puppeteer (`puppeteer.launch()`).
    - Buka halaman baru dan atur konten HTML menggunakan template data form.
    - Generate output buffer menggunakan `page.pdf()` dengan opsi ukuran kertas A4, margin, dan print background graphics diaktifkan.
    - Tutup browser instance secara aman untuk menghindari memory leak.
  - [ ] Daftarkan route `GET /api/v1/local-charges/:id/print` untuk mengirim output buffer PDF langsung dengan header `Content-Type: application/pdf`.
* **Kriteria Sukses**:
  - [ ] Mengakses endpoint print mengembalikan file PDF.
  - [ ] File PDF memiliki layout teratur, margin proporsional, serta tabel detail terpotong rapi tanpa terpotong di tengah baris (CSS page-break rule).

#### Task 4.2: Approval Workflow & UI Validation
* **Tujuan**: Mengimplementasikan flow tanda tangan persetujuan bertahap berdasarkan role user.
* **File Terkait**:
  * `backend/src/routes/localCharges.ts`
  * `backend/src/controllers/localChargesController.ts`
  * `frontend/src/components/form/ApprovalFooter.tsx`
  * `frontend/src/pages/DetailFormPage.tsx`
* **Checklist**:
  - [ ] Tulis API approval `POST /api/v1/local-charges/:id/approve` yang menerima body `{ step: 'direquest'|'billing'|'ar'|'diketahui', nama: string }`.
  - [ ] Tambahkan validasi otorisasi ketat di backend:
    - User dengan role `billing` hanya bisa menyetujui langkah `billing`.
    - User dengan role `ar` hanya bisa menyetujui langkah `ar`.
    - Langkah approval harus berurutan: `Draft` (1) -> `Direquest` (2) -> `Billing` (3) -> `AR` (4) -> `Done` (5).
    - Update kolom terkait di database (contoh untuk billing: isi `fdBilling` dengan nama user dan `fdTglBilling` dengan waktu saat ini, lalu set `fdStatus` ke status berikutnya).
  - [ ] Di frontend `ApprovalFooter.tsx`, tampilkan 5 kotak tanda tangan digital.
  - [ ] Render tombol "Approve" aktif hanya jika status form saat ini adalah giliran user tersebut dan role user yang login sesuai. Jika tidak, tampilkan kotak tanda tangan kosong atau teks nama penandatangan terdahulu.
* **Kriteria Sukses**:
  - [ ] User biasa (role: user) mencoba menembak API approve billing diblokir dengan status HTTP `403 Forbidden`.
  - [ ] User AR tidak dapat menyetujui form sebelum form tersebut disetujui oleh Billing.
  - [ ] Ketika user yang berhak menekan tombol "Approve", status form berubah, nama & tanggal approval muncul seketika di kotak tanda tangan yang sesuai.

#### Task 4.3: Export Excel, Polish & Mobile View Responsive
* **Tujuan**: Menyediakan fitur ekspor laporan, penyesuaian tampilan mobile, dan transisi UI yang halus.
* **File Terkait**:
  * `frontend/src/pages/DashboardPage.tsx`
  * `frontend/src/App.tsx`
  * `frontend/src/index.css`
* **Checklist**:
  - [ ] Tambahkan tombol "Export Excel" pada Dashboard. Gunakan library client-side seperti `xlsx` atau buat endpoint backend yang mengembalikan file streaming spreadsheet Excel.
  - [ ] Desain CSS layout agar adaptif pada perangkat mobile: tabel detail menggunakan overflow-x horizontal scroll, sidebar berubah menjadi hamburger menu melayang, form input tumpuk secara vertikal.
  - [ ] Tambahkan micro-interaction: efek hover tombol yang halus, skeleton loading state, transisi modal masuk, dan konfirmasi toast pemberitahuan yang responsif.
  - [ ] Tambahkan Error Boundary React di level root aplikasi untuk menangkap error javascript secara aman tanpa membuat layar putih kosong.
* **Kriteria Sukses**:
  - [ ] Tombol Export mengunduh file `.xlsx` yang berisi daftar data local charges yang sedang difilter dengan kolom yang lengkap.
  - [ ] Tampilan halaman form input tidak rusak dan dapat diisi dengan nyaman saat diuji menggunakan screen simulator mobile phone (resolusi 375px).
  - [ ] Aplikasi berjalan tanpa ada error konsol javascript unhandled.

---

## 12. Naming Conventions

| Konteks | Konvensi | Contoh |
|---|---|---|
| Tabel DB | prefix `tb` | `tbLocalCharges` |
| Kolom DB | prefix `fd` | `fdNamaCustomer` |
| Komponen React | PascalCase | `LampiranGrid.tsx` |
| Hook | camelCase + `use` prefix | `useLampiran.ts` |
| File pages/routes | kebab-case | `detail-form-page.tsx` |
| File upload disk | UUID + ext | `a1b2c3d4-1234567890.jpg` |

---

## 13. Catatan Teknis Penting

### File Upload
- Gunakan `@hono/node-server` + library multipart (busboy) di backend Bun/Hono.
- **Jangan simpan file di database (BLOB)** — simpan di disk, simpan path di DB.
- Folder `uploads/` wajib masuk dalam daftar `.gitignore`.
- Tambahkan file `index.html` kosong di setiap subfolder uploads untuk keamanan (cegah directory listing).
- Backup strategy: cukup backup folder `uploads/` bersama database.

### Keamanan File
- File hanya bisa diakses via endpoint `/api/v1/files/:filename` yang dilindungi JWT.
- Validasi ekstensi file di backend (jangan percaya ekstensi dari client).
- Validasi `magic bytes` (file signature) untuk deteksi tipe file asli.
- Rename file ke UUID — jangan gunakan nama asli dari user (path traversal risk).

### No. Form Auto-Generate
- Format: `LC-YYYYMM-XXXX` (contoh: `LC-202606-0001`)
- Generate server-side dalam SQL transaction:
  ```sql
  DECLARE @prefix VARCHAR(10) = 'LC-' + FORMAT(GETDATE(), 'yyyyMM') + '-';
  SELECT @prefix + RIGHT('0000' + CAST(COUNT(*)+1 AS VARCHAR), 4)
  FROM tbLocalCharges
  WHERE fdNomorForm LIKE @prefix + '%';
  ```