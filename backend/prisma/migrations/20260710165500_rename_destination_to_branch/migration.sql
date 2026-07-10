-- ============================================================
-- Migration: Rename 'destination' to 'branch'
-- ============================================================

-- Rename the column using sp_rename to preserve data
EXEC sp_rename 'PriceListItem.destination', 'branch', 'COLUMN';

-- Drop the old index
DROP INDEX [PriceListItem_sheetType_mode_destination_category_idx] ON [PriceListItem];

-- Create the new index
CREATE NONCLUSTERED INDEX [PriceListItem_sheetType_mode_branch_category_idx] ON [PriceListItem]
(
    [sheetType] ASC,
    [mode] ASC,
    [branch] ASC,
    [category] ASC
);
