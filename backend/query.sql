CREATE TABLE [dbo].[PriceListUpload] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [fileName] NVARCHAR(255) NOT NULL,
    [uploadedBy] INT,
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [DF_PriceListUpload_uploadedAt] DEFAULT CURRENT_TIMESTAMP,
    [priceDate] DATETIME2,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_PriceListUpload_status] DEFAULT 'PARSED',
    [warnings] NVARCHAR(MAX),
    [rawSnapshot] NVARCHAR(MAX),
    CONSTRAINT [PK_PriceListUpload] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[PriceListItem] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [uploadId] INT NOT NULL,
    [sheetType] NVARCHAR(20) NOT NULL,
    [mode] NVARCHAR(20) NOT NULL,
    [destination] NVARCHAR(20) NOT NULL,
    [transitTime] NVARCHAR(50),
    [category] NVARCHAR(150) NOT NULL,
    [price] DECIMAL(14,2) NOT NULL,
    CONSTRAINT [PK_PriceListItem] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [IX_PriceListUpload_uploadedAt] ON [dbo].[PriceListUpload]([uploadedAt]);
CREATE NONCLUSTERED INDEX [IX_PriceListUpload_priceDate] ON [dbo].[PriceListUpload]([priceDate]);

CREATE NONCLUSTERED INDEX [IX_PriceListItem_uploadId] ON [dbo].[PriceListItem]([uploadId]);
CREATE NONCLUSTERED INDEX [IX_PriceListItem_sheetType_mode_destination_category] ON [dbo].[PriceListItem]([sheetType], [mode], [destination], [category]);

ALTER TABLE [dbo].[PriceListUpload] ADD CONSTRAINT [PriceListUpload_uploadedBy_fkey] FOREIGN KEY ([uploadedBy]) REFERENCES [dbo].[tbUsers]([fdId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[PriceListItem] ADD CONSTRAINT [PriceListItem_uploadId_fkey] FOREIGN KEY ([uploadId]) REFERENCES [dbo].[PriceListUpload]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
