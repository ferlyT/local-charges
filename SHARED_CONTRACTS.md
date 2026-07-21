# Shared Contracts

This document outlines the shared contracts between the frontend and backend, including the database schema, API routing structures, and core domain models.

## Database Schema (Prisma)
The backend uses **Prisma** with **SQL Server**. Here are the core models:

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
- **`PriceListUpload`**: `id`, `fileName`, `uploadedBy`, `effectiveDate`, `status`
- **`PriceListItem`**: Details from uploaded `.xlsx` files (`sheetType`, `mode`, `branch`, `category`, `price`).

## API Structure (ElysiaJS)
The backend is built with Bun + ElysiaJS. All endpoints are prefixed with `/api`.
Standard response envelope: `{ success: boolean, data?: any, message?: string, error?: string }`

- **Auth**: `/api/auth/login`, `/api/auth/me`, `/api/auth/profile`
- **Users & Roles**: `/api/users/*`, `/api/roles/*`
- **Local Charges**: `/api/local-charges/*`
- **Inspection Reports**: `/api/inspection-reports/*`
- **Price List**: `/api/pricelist/*`

## Frontend Types
- Frontend stores JWT tokens using Zustand (`authStore.ts`).
- Dates are generally ISO strings or converted using `toLocaleDateString`.
- Translation keys are mapped in `src/lib/translations.ts`.
