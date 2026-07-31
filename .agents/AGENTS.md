# Agent Rules & Guidelines

This document provides architectural rules, coding standards, and constraints that all AI Agents must follow when modifying this codebase.

---

## 1. Frontend Architecture (Feature-Sliced Design)
We use a **Feature-Based Architecture**. Do NOT place domain-specific logic, pages, or components in global folders (like `src/pages`).
Instead, encapsulate feature logic inside `src/features/<feature-name>/`.

### Feature Structure
Each feature must encapsulate its own:
- `pages/` (Page-level React components)
- `components/` (Local UI components used ONLY by this feature)
- `index.ts` (The Public API of the feature. **Only export what is needed by the rest of the app**, usually just the Pages).

*Example:*
```
src/features/local-charges/
  pages/
    LocalChargesList.tsx
    LocalChargesForm.tsx
  index.ts
```

### Routing & Navigation
- The main router is defined in `src/App.tsx`.
- Import pages exclusively from the feature's `index.ts` (e.g., `import { LocalChargesList } from './features/local-charges';`).
- Secure routes using `<ProtectedRoute>` and `<PermissionRoute>` wrappers based on user roles and permissions.

---

## 2. Coding Standards & Shared Assets

### Shared Utilities & Formatting (`src/lib/utils.ts`)
- **DO NOT duplicate formatting functions** (e.g., `formatRupiah`, date helpers) locally inside page or component files.
- Always check `src/lib/utils.ts` first. If a utility function is missing, add it to `src/lib/utils.ts` and import it.
- **Rupiah Formatting**: Always use `formatRupiah(value)` from `src/lib/utils.ts` (`Intl.NumberFormat('id-ID', ...)`).

### Reusable UI Components (`src/components/ui/`)
- Place generic, domain-agnostic UI helpers in `src/components/ui/`:
  - `FadeIn.tsx`: Wrapper for smooth fade & slide-up animation.
  - `SortIcon.tsx`: Reusable table header column sort indicator.
  - `Spinner.tsx`: Loading spinner.
- Do NOT rewrite or copy-paste animation wrappers or table sort indicators across features.

### Global Constants & Enums (`src/lib/constants.ts`)
- All status maps, status definitions, and global constants must reside in `src/lib/constants.ts`.
- **Object Key Safety**: When defining status maps or lookups in TypeScript object literals, use **string keys** exclusively (e.g. `'1'`, `'2'`, `'5'`) to prevent JS property key duplication errors.

### State Management & API Client
- **Zustand**: Use Zustand for global application state (`authStore`, `themeStore`, `languageStore`). Avoid React Context unless strictly required for third-party libraries.
- **Axios Client**: Use `api` from `src/lib/api.ts` for HTTP requests. It handles JWT header injection and 401 redirect logic automatically.

### Internationalization (i18n)
- **NO hardcoded user-facing strings** in components or pages.
- Use `useTranslation` hook from `src/hooks/useTranslation.ts`.
- Always add new translation keys to **BOTH** `en` and `id` dictionaries in `src/lib/translations.ts`.
- Usage: `const { t } = useTranslation(); <p>{t('key_name')}</p>`

---

## 3. Backend Guidelines (Bun + Hono + Prisma 7)

### Framework & Routing (Hono)
- Backend uses **Bun + Hono** (not ElysiaJS).
- Controllers/Route handlers must remain thin.
- Route-level validation must use **Zod** schemas via `@hono/zod-validator` (`zValidator`).
- Always wrap route logic in `try/catch` and log errors via `logger.error(...)`.
- Endpoints requiring authentication must apply `jwt` and `authPlugin` middlewares.

### Database (Prisma 7.x + SQL Server)
- Project uses **Prisma 7.x** with driver adapters (`@prisma/adapter-mssql`).
- Connection URL lives in `prisma.config.ts` (not inside `schema.prisma`).
- Schema `generator` block must specify `engineType = "client"` (compatible with driver adapter pattern in `src/db/prisma.ts`).
- Do NOT run `prisma generate` unless the Prisma schema itself changes.

---

## 4. Design System & Styling Rules

### Styling Framework
- Use **TailwindCSS** for all styling with dark mode support via the `class` strategy.
- Use semantic color tokens defined in `index.css` / `tailwind.config.js`:
  - `primary`: Main text color & primary UI elements.
  - `secondary`: Muted text, borders, secondary buttons.
  - `tertiary`: Accent color (primary buttons, active states).
  - `neutral`: Component card backgrounds, table header fills.
  - `surface`: Page main background color.
- Avoid arbitrary hardcoded color hex values (e.g. `text-[#123456]`).

### Core CSS Utilities & Badges
- Buttons: `.btn-primary` (main actions), `.btn-secondary` (cancel/secondary actions).
- Container Cards: `.card`.
- Status Badges:
  - Draft: `.badge-draft`
  - Done: `.badge-done`
  - Warning/Partial: `bg-amber-500/10 text-amber-600 border-amber-500/25`
  - Danger/Error: `bg-rose-500/10 text-rose-600 border-rose-500/25`
  - Success/Closed: `bg-emerald-500/10 text-emerald-600 border-emerald-500/25`

### Lucide Icons
- Use **`lucide-react`** for all icons with standard sizes (`16`, `18`, `24`).
- **CRITICAL - Icon Aliasing**: Icons whose names match DOM globals or React components (e.g., `History`, `Upload`, `User`) **MUST BE ALIASED** upon import to prevent JSX compilation errors:
  `import { History as HistoryIcon, Upload as UploadIcon, User as UserIcon } from 'lucide-react';`

---

## 5. Shared Contracts & Schemas

### Core Database Models
- **Auth & Authorization**: `tbUsers` (`fdId`, `fdNama`, `fdUsername`, `fdRoleId`, `fdAvatar`), `tbRoles`, `tbRolePermissions`.
- **Local Charges**: `tbLocalCharges` (`fdId`, `fdNomorForm`, `fdStatus`, `fdCreatedBy`), `tbLocalChargesDetail`, `tbLocalChargesLampiran`.
- **Inspection Reports**: `tbInspectionReport` (`fdId`, `fdReportNumber`, `fdReportDate`, `fdStatus`), `VwtbEntryListCustomer` (SQL View for lookup autocomplete).
- **Price List**: `tbPriceListUpload` (`fdId`, `fdFileName`, `fdPriceDate`, `fdEffectiveDate`, `fdStatus`), `tbPriceListItem` (`fdSheetType`, `fdMode`, `fdBranch`, `fdCategory`, `fdPrice`).
- **API Mapping**: Price List database column names (`fdXxx`) are mapped to **camelCase** (`fileName`, `effectiveDate`, `branch`, `price`) in `priceList.service.ts` before returning API responses.

---

## 6. Proactive Bug Prevention & Verification Checklist

- **No Dead / Commented-Out Code**: Remove unused code blocks, legacy commented routes, and stale imports.
- **Icon Conflict Audit**: Check `lucide-react` imports for `History`, `Upload`, `User` before adding icon tags.
- **Build Verification**: Before concluding any task or refactoring, ALWAYS run build verification:
  - Frontend: `npm run build` or `cmd.exe /c "npx tsc --noEmit"`
  - Backend: `cmd.exe /c "npx tsc --noEmit"`