# Local Charges Management System

Sistem manajemen *Local Charges* full-stack yang modern, cepat, dan aman. Aplikasi ini memungkinkan pengguna untuk membuat, memantau, dan mengelola form penagihan lokal, lengkap dengan sistem hak akses (RBAC) dinamis, analitik dashboard, dan manajemen lampiran.

## 🚀 Fitur Utama

### 📊 Dashboard & Analitik
- Ringkasan KPI (Key Performance Indicator).
- Widget grafik berbasis CSS (tanpa library tambahan) untuk performa memori yang sangat ringan.
- Tabel dengan fitur *sorting* *server-side*, pencarian real-time (dengan debounce), dan *pagination* kustom.
- Dukungan *Grid View* dan *Table View*.

### 🔒 Role-Based Access Control (RBAC) & Autentikasi
- Login & Register dengan JWT (JSON Web Token).
- Sistem *Permission* granular (`local_charges:read`, `local_charges:create`, `users:manage`, dll.).
- Middleware backend untuk memvalidasi *permission* di level API.
- Tampilan UI frontend yang secara dinamis menyembunyikan/menampilkan tombol berdasarkan hak akses pengguna yang sedang login.

### 📝 Manajemen Form & Lampiran
- Form kompleks dengan relasi tabel *Master-Detail*.
- Pembuatan nomor form secara berurutan dan otomatis (Auto-generate).
- Lampiran file (*multipart/form-data*) dengan dukungan multi-upload.
- Fitur *Preview/Lightbox* untuk melihat lampiran (gambar/PDF) beserta fitur *Zoom*, *Rotate*, dan *Download*.

### 🎨 UI/UX Modern
- *Dark Mode* support terintegrasi.
- Desain *Glassmorphism* dan micro-animasi yang responsif.
- Komponen *Autocomplete* interaktif untuk inputan data repetitif.

---

## 🛠️ Tech Stack

### Frontend
- **React 18** (Vite)
- **Tailwind CSS** (Styling, Dark Mode)
- **Zustand** (State Management untuk Auth & Tema)
- **React Router DOM** (Client-side Routing)
- **React Query (TanStack)** (Data fetching, caching, sinkronisasi)
- **Lucide React** (Ikon SVG yang modern)
- **Axios** (HTTP Client)

### Backend
- **Bun** (Runtime & Package Manager super cepat)
- **Hono** (Web framework ringan dan kencang)
- **Prisma ORM** (Database toolkit)
- **Microsoft SQL Server** (Database Engine)
- **Zod** (Validasi skema request)

---

## 🚦 Cara Menjalankan Project (Local Development)

### Persyaratan Sistem:
- **Node.js** & **npm** (untuk frontend)
- **Bun** (untuk backend)
- **SQL Server** (database)

### 1. Setup Database & Backend
Masuk ke direktori `backend/`:
```bash
cd backend
```
Install dependencies menggunakan Bun:
```bash
bun install
```
Buat file `.env` di dalam folder `backend` dan isi string koneksi database Anda:
```env
DATABASE_URL="sqlserver://localhost:1433;database=dbLocalCharges;user=sa;password=PasswordAnda;encrypt=true;trustServerCertificate=true;"
JWT_SECRET="rahasia_super_aman"
PORT=3001
```
Jalankan migrasi database dan *seeding* (membuat akun admin & role bawaan):
```bash
bunx prisma db push
bun run prisma/seedRoles.ts
bun run prisma/seed.ts
```
Jalankan server backend (dengan mode watch/auto-restart):
```bash
bun --watch src/index.ts
```

### 2. Setup Frontend
Buka terminal baru dan masuk ke direktori `frontend/`:
```bash
cd frontend
```
Install dependencies menggunakan npm:
```bash
npm install
```
Buat file `.env` (jika Anda menjalankan backend di port selain 3001):
```env
VITE_API_URL=http://localhost:3001/api/v1
```
Jalankan development server:
```bash
npm run dev
```

Aplikasi sekarang dapat diakses melalui browser di `http://localhost:5173`.

---

## 👥 Akun Default

Setelah Anda menjalankan *seed* database, Anda bisa login menggunakan akun admin bawaan:

- **Username**: `admin`
- **Password**: `admin123`

*(Catatan: Jangan lupa untuk mengubah password default pada tahap produksi!)*
