# Agent Rules & Guidelines

This document provides architectural rules and constraints that all AI Agents must follow when modifying this codebase.

## Frontend Architecture (Feature-Sliced Design)
We use a **Feature-Based Architecture**. Do NOT place domain-specific logic, pages, or components in global folders (like `src/pages`).
Instead, use `src/features/<feature-name>/`.

### Feature Structure
Each feature must encapsulate its own:
- `pages/` (Page-level React components)
- `components/` (Local UI components used only by this feature)
- `index.ts` (The Public API of the feature. **Only export what is needed by the rest of the app**, usually just the Pages).

*Example:*
```
src/features/local-charges/
  pages/
    LocalChargesList.tsx
    LocalChargesForm.tsx
  index.ts
```

### Routing
The main router is defined in `src/App.tsx`.
- Import pages exclusively from the feature's `index.ts` (e.g., `import { LocalChargesList } from './features/local-charges';`).
- Secure routes using the `<ProtectedRoute>` and `<PermissionRoute>` wrappers based on user roles.

## Imports & Dependencies
- **Relative Imports**: When importing global utilities (`lib`, `hooks`, `stores`, `components`) from within a feature, use relative paths (e.g., `../../../lib/api`).
- **State Management**: Use `Zustand` for global state (like auth). Avoid React Context unless absolutely necessary.
- **Notifications**: Use `react-hot-toast` for success/error toasts.

## Internationalization (i18n)
- Do NOT hardcode user-facing text in the UI.
- Use the `useTranslation` hook from `src/hooks/useTranslation.ts`.
- Add new translation strings to BOTH `en` and `id` objects in `src/lib/translations.ts`.
- Usage: `const { t } = useTranslation(); <p>{t('your_key')}</p>`

## Backend Guidelines (Bun + Hono)
<!-- DIPERBAIKI: dokumen lama menyebut "Bun + ElysiaJS" dan validasi TypeBox `t`.
     Dikonfirmasi dari package.json backend (dependencies: hono, @hono/node-server,
     @hono/zod-validator, hono-rate-limiter) — framework aktual adalah Hono, bukan Elysia. -->
- Keep controllers thin. Validation must be done using **Zod** schemas via `@hono/zod-validator` (`zValidator`) at the route level — not Elysia's TypeBox `t`.
- Always use `try/catch` and return appropriate HTTP status codes via `c.json(data, status)`.
- Ensure all endpoints that require authorization use the `jwt` and `authPlugin` middlewares.
- Do not run `prisma generate` unless the schema changes. The environment uses `bun`.
- **Prisma**: project uses **Prisma 7.x** with driver adapters (`@prisma/adapter-mssql`), not the classic Rust binary engine. Connection URL lives in `prisma.config.ts`, not in `schema.prisma`'s `datasource` block. Generator block should use `engineType = "client"` (not `"binary"`) to stay compatible with the driver adapter — see `prisma.ts` for the `PrismaClient({ adapter })` instantiation pattern.

## Proactive Bug Prevention
- **Icon Conflicts**: When using `lucide-react`, watch out for components named the same as the icons (e.g., `History`, `Upload`). Always alias the icon import: `import { Upload as UploadIcon } from 'lucide-react';`.
- **TypeScript Checking**: Before finishing any major refactor, always run `npx tsc --noEmit` in the frontend directory to ensure there are no broken imports or missing types.


# Design System

This document outlines the core design system used in the application.

## Styling Framework
We use **TailwindCSS** for all styling, with Dark Mode support via the `class` strategy.

## Color Palette
Colors are defined using CSS variables in `index.css` and mapped in `tailwind.config.js`. Do not use arbitrary colors (e.g., `text-[#123456]`), always use the semantic tokens.

- **`primary`**: Main text color and prominent UI elements.
- **`secondary`**: Subdued text, borders, and secondary buttons.
- **`tertiary`**: The primary brand accent color (often used for primary buttons and active states).
- **`neutral`**: Backgrounds for cards, table headers, and alternating rows.
- **`surface`**: Main background color (white in light mode, dark in dark mode).

## Typography
Fonts are configured in Tailwind:
- **`font-sans`** (`Inter`): Default font for body text, UI elements, and tables.
- **`font-display`** (`Instrument Serif`): Used exclusively for large headers and welcome banners.
- **`font-mono`** (`JetBrains Mono`): Used for numbers, form IDs, and technical data to ensure vertical alignment.

## Core UI Components
Instead of rewriting Tailwind classes, use the shared utility classes (typically defined in `index.css`):
- **Buttons**:
  - `.btn-primary`: For main actions (uses `tertiary` color).
  - `.btn-secondary`: For secondary or cancel actions.
- **Cards**:
  - `.card`: Standard container with border, background, and shadow.
- **Badges**:
  - Used for status indicators.
  - Success: `bg-emerald-500/10 text-emerald-600 border-emerald-500/25`
  - Warning/Partial: `bg-amber-500/10 text-amber-600 border-amber-500/25`
  - Danger/Error: `bg-rose-500/10 text-rose-600 border-rose-500/25`
  - Draft: `.badge-draft`
  - Done: `.badge-done`

## Icons
Use **`lucide-react`** for all icons. Standard sizes are `16`, `18`, or `24`.
If there's a naming conflict with a component (e.g., `History` or `Upload`), rename the icon in the import:
`import { History as HistoryIcon } from "lucide-react";`

# Shared Contracts

This document outlines the shared contracts between the frontend and backend, including the database schema, API routing structures, and core domain models.

## Database Schema (Prisma)
The backend uses **Prisma 7.x** (driver adapters, `@prisma/adapter-mssql`) with **SQL Server**. Here are the core models:

### 1. Authentication & Authorization
- **`tbUsers`**: `fdId`, `fdNama`, `fdUsername`, `fdPassword`, `fdAktif`, `fdRoleId`, `fdAvatar`
- **`tbRoles`**: `fdId`, `fdNama`, `fdDeskripsi`
- **`tbRolePermissions`**: `fdId`, `fdRoleId`, `fdPermission`

### 2. Local Charges
- **`tbLocalCharges`**: `fdId`, `fdNomorForm`, `fdStatus`, `fdCreatedBy` (relation to `tbUsers`), etc.
- **`tbLocalChargesDetail`**: Child records for charges (`fdNamaCustomer`, `fdMarking`, `fdNoReceipt`, etc.)
- **`tbLocalChargesLampiran`**: File attachments.

### 3. Inspection Reports (BAP)
- **`tbInspectionReport`**: `fdId`, `fdReportNumber`, `fdReportDate`, `fdListCode`, `fdMarkingCode`, `fdStatus`, `fdCreatedBy`, etc.
- **`VwtbEntryListCustomer`**: SQL View mapped to provide auto-completion data for reports.
- **`tbInspectionReportLampiran`**: File attachments.

### 4. Price List
<!-- DIPERBAIKI: model lama (`PriceListUpload`/`PriceListItem`) tidak mengikuti konvensi
     penamaan tbXxx/fdXxx yang dipakai seluruh modul lain. Sudah diperbaiki lewat
     migration terpisah (lihat plan-fix-naming.md) — model dan kolom sekarang konsisten. -->
- **`tbPriceListUpload`**: `fdId`, `fdFileName`, `fdUploadedBy` (relation to `tbUsers`), `fdUploadedAt`, `fdPriceDate`, `fdEffectiveDate`, `fdStatus`, `fdWarnings`, `fdRawSnapshot`.
- **`tbPriceListItem`**: Details from uploaded `.xlsx` files — `fdId`, `fdUploadId` (relation to `tbPriceListUpload`), `fdSheetType`, `fdMode`, `fdBranch`, `fdTransitTime`, `fdCategory`, `fdPrice`.
- **Penting**: response API modul Price List (`GET`/`POST /api/pricelist/*`) tetap mengembalikan field dalam **camelCase** (`fileName`, `effectiveDate`, `branch`, `price`, dst) — `fdXxx` adalah nama kolom internal Prisma/DB saja, di-mapping balik ke camelCase di service layer (`mapUploadToApi`/`mapItemToApi` di `priceList.service.ts`) sebelum dikirim ke frontend. Konsumen frontend tidak perlu tahu soal prefix `fd`.
- Fitur tambahan (multi-cabang & kode marking per upload, pairing 1 cabang : 1 marking) direncanakan lewat model `tbPriceListUploadBranch` — belum dieksekusi, lihat `plan.md` terpisah untuk detail skema.

## API Structure (Hono)
<!-- DIPERBAIKI: dokumen lama menyebut ElysiaJS. Dikonfirmasi Hono dari package.json. -->
The backend is built with **Bun + Hono**. All endpoints are prefixed with `/api`.

⚠️ **Belum terverifikasi**: dokumen lama menyatakan standard response envelope `{ success: boolean, data?: any, message?: string, error?: string }` untuk semua endpoint. Contoh route Price List yang sudah dilihat (`c.json(result, 201)`) mengembalikan hasil **langsung tanpa envelope**. Belum dikonfirmasi apakah ini penyimpangan khusus modul Price List, atau envelope ini sebenarnya tidak/belum diterapkan konsisten di seluruh API. Perlu dicek langsung ke source route lain (`auth.ts`, `users.ts`, dll) sebelum baris ini dianggap akurat.

- **Auth**: `/api/auth/login`, `/api/auth/me`, `/api/auth/profile`
- **Users & Roles**: `/api/users/*`, `/api/roles/*`
- **Local Charges**: `/api/local-charges/*`
- **Inspection Reports**: `/api/inspection-reports/*`
- **Price List**: `/api/pricelist/*`

## Frontend Types
- Frontend stores JWT tokens using Zustand (`authStore.ts`).
- Dates are generally ISO strings or converted using `toLocaleDateString`.
- Translation keys are mapped in `src/lib/translations.ts`.