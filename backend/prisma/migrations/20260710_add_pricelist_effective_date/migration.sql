-- ============================================================
-- Migration: Add effectiveDate to PriceListUpload
-- Reset all existing PriceList data (no prior data to preserve)
-- ============================================================

-- Step 1: Reset data lama (order: item dulu, baru upload karena FK)
DELETE FROM PriceListItem;
DELETE FROM PriceListUpload;

-- Step 2: Tambah kolom effectiveDate (NOT NULL)
-- Karena tabel sudah kosong, bisa langsung NOT NULL
ALTER TABLE PriceListUpload
  ADD effectiveDate DATETIME2 NOT NULL
    CONSTRAINT DF_PLUpload_effectiveDate DEFAULT GETDATE();

-- Step 3: Hapus default constraint setelah kolom dibuat
ALTER TABLE PriceListUpload
  DROP CONSTRAINT DF_PLUpload_effectiveDate;

-- Step 4: Tambah index untuk performa query timeline
CREATE INDEX IX_PriceListUpload_effectiveDate
  ON PriceListUpload (effectiveDate);
