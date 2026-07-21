BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[tbUsers] (
    [fdId] INT NOT NULL IDENTITY(1,1),
    [fdNama] VARCHAR(100) NOT NULL,
    [fdUsername] VARCHAR(50) NOT NULL,
    [fdPassword] VARCHAR(255) NOT NULL,
    [fdAktif] BIT NOT NULL CONSTRAINT [tbUsers_fdAktif_df] DEFAULT 1,
    [fdCreatedAt] DATETIME2 NOT NULL CONSTRAINT [tbUsers_fdCreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [fdAvatar] VARCHAR(500),
    [fdRoleId] INT,
    CONSTRAINT [tbUsers_pkey] PRIMARY KEY CLUSTERED ([fdId]),
    CONSTRAINT [tbUsers_fdUsername_key] UNIQUE NONCLUSTERED ([fdUsername])
);

-- CreateTable
CREATE TABLE [dbo].[tbRoles] (
    [fdId] INT NOT NULL IDENTITY(1,1),
    [fdNama] VARCHAR(50) NOT NULL,
    [fdDeskripsi] VARCHAR(255),
    [fdCreatedAt] DATETIME2 NOT NULL CONSTRAINT [tbRoles_fdCreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tbRoles_pkey] PRIMARY KEY CLUSTERED ([fdId]),
    CONSTRAINT [tbRoles_fdNama_key] UNIQUE NONCLUSTERED ([fdNama])
);

-- CreateTable
CREATE TABLE [dbo].[tbRolePermissions] (
    [fdId] INT NOT NULL IDENTITY(1,1),
    [fdRoleId] INT NOT NULL,
    [fdPermission] VARCHAR(100) NOT NULL,
    CONSTRAINT [tbRolePermissions_pkey] PRIMARY KEY CLUSTERED ([fdId]),
    CONSTRAINT [tbRolePermissions_fdRoleId_fdPermission_key] UNIQUE NONCLUSTERED ([fdRoleId],[fdPermission])
);

-- CreateTable
CREATE TABLE [dbo].[tbLocalCharges] (
    [fdId] INT NOT NULL IDENTITY(1,1),
    [fdNomorForm] VARCHAR(30) NOT NULL,
    [fdQty] DECIMAL(10,3),
    [fdSatuanQty] VARCHAR(20) CONSTRAINT [tbLocalCharges_fdSatuanQty_df] DEFAULT 'M3',
    [fdStatus] TINYINT NOT NULL CONSTRAINT [tbLocalCharges_fdStatus_df] DEFAULT 1,
    [fdDibuat] VARCHAR(100),
    [fdTglDibuat] DATETIME2,
    [fdDirequest] VARCHAR(100),
    [fdTglDirequest] DATETIME2,
    [fdBilling] VARCHAR(100),
    [fdTglBilling] DATETIME2,
    [fdAR] VARCHAR(100),
    [fdTglAR] DATETIME2,
    [fdDiketahui] VARCHAR(100),
    [fdTglDiketahui] DATETIME2,
    [fdCreatedBy] INT NOT NULL,
    [fdCreatedAt] DATETIME2 NOT NULL CONSTRAINT [tbLocalCharges_fdCreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [fdUpdatedAt] DATETIME2 NOT NULL CONSTRAINT [tbLocalCharges_fdUpdatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [fdDeletedAt] DATETIME2,
    CONSTRAINT [tbLocalCharges_pkey] PRIMARY KEY CLUSTERED ([fdId]),
    CONSTRAINT [tbLocalCharges_fdNomorForm_key] UNIQUE NONCLUSTERED ([fdNomorForm])
);

-- CreateTable
CREATE TABLE [dbo].[tbLocalChargesDetail] (
    [fdId] INT NOT NULL IDENTITY(1,1),
    [fdLocalChargesId] INT NOT NULL,
    [fdNo] TINYINT NOT NULL,
    [fdNamaCustomer] VARCHAR(150) NOT NULL,
    [fdMarking] VARCHAR(100),
    [fdNoReceipt] VARCHAR(100),
    [fdNoBilling] VARCHAR(100),
    [fdKeterangan] VARCHAR(500),
    [fdNoInputan] VARCHAR(100),
    CONSTRAINT [tbLocalChargesDetail_pkey] PRIMARY KEY CLUSTERED ([fdId])
);

-- CreateTable
CREATE TABLE [dbo].[tbLocalChargesLampiran] (
    [fdId] INT NOT NULL IDENTITY(1,1),
    [fdLocalChargesId] INT NOT NULL,
    [fdNamaFile] VARCHAR(255) NOT NULL,
    [fdNamaFileSimpan] VARCHAR(255) NOT NULL,
    [fdMimeType] VARCHAR(100) NOT NULL,
    [fdUkuranBytes] BIGINT NOT NULL,
    [fdPath] VARCHAR(500) NOT NULL,
    [fdUploadedBy] INT NOT NULL,
    [fdUploadedAt] DATETIME2 NOT NULL CONSTRAINT [tbLocalChargesLampiran_fdUploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [fdKeterangan] VARCHAR(255),
    CONSTRAINT [tbLocalChargesLampiran_pkey] PRIMARY KEY CLUSTERED ([fdId])
);

-- CreateTable
CREATE TABLE [dbo].[vwtbEntryListCustomer] (
    [fdListCode] CHAR(7) NOT NULL,
    [fdMarkingCode] CHAR(30) NOT NULL,
    [fdMarkingNo] CHAR(50) NOT NULL,
    [fdTerima] NVARCHAR(1000),
    [fdCustName] VARCHAR(150),
    CONSTRAINT [vwtbEntryListCustomer_pkey] PRIMARY KEY CLUSTERED ([fdListCode])
);

-- CreateTable
CREATE TABLE [dbo].[tbInspectionReport] (
    [fdId] INT NOT NULL IDENTITY(1,1),
    [fdReportNumber] VARCHAR(30) NOT NULL,
    [fdReportDate] DATETIME2 NOT NULL,
    [fdListCode] CHAR(7) NOT NULL,
    [fdMarkingCode] CHAR(30) NOT NULL,
    [fdMarkingNo] CHAR(50) NOT NULL,
    [fdNamaCustomer] VARCHAR(150) NOT NULL,
    [fdTerima] VARCHAR(50),
    [fdKeterangan] VARCHAR(max) NOT NULL,
    [fdStatus] VARCHAR(1) NOT NULL CONSTRAINT [tbInspectionReport_fdStatus_df] DEFAULT '1',
    [fdCreatedBy] INT NOT NULL,
    [fdCreatedAt] DATETIME2 NOT NULL CONSTRAINT [tbInspectionReport_fdCreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [fdUpdatedAt] DATETIME2 NOT NULL CONSTRAINT [tbInspectionReport_fdUpdatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [fdDeletedAt] DATETIME2,
    CONSTRAINT [tbInspectionReport_pkey] PRIMARY KEY CLUSTERED ([fdId]),
    CONSTRAINT [tbInspectionReport_fdReportNumber_key] UNIQUE NONCLUSTERED ([fdReportNumber])
);

-- CreateTable
CREATE TABLE [dbo].[tbInspectionReportLampiran] (
    [fdId] INT NOT NULL IDENTITY(1,1),
    [fdInspectionReportId] INT NOT NULL,
    [fdNamaFile] VARCHAR(255) NOT NULL,
    [fdNamaFileSimpan] VARCHAR(255) NOT NULL,
    [fdMimeType] VARCHAR(100) NOT NULL,
    [fdUkuranBytes] BIGINT NOT NULL,
    [fdPath] VARCHAR(500) NOT NULL,
    [fdUploadedBy] INT NOT NULL,
    [fdUploadedAt] DATETIME2 NOT NULL CONSTRAINT [tbInspectionReportLampiran_fdUploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [fdKeterangan] VARCHAR(255),
    CONSTRAINT [tbInspectionReportLampiran_pkey] PRIMARY KEY CLUSTERED ([fdId])
);

-- CreateTable
CREATE TABLE [dbo].[tbPriceListUpload] (
    [fdId] INT NOT NULL IDENTITY(1,1),
    [fdFileName] NVARCHAR(255) NOT NULL,
    [fdUploadedBy] INT,
    [fdUploadedAt] DATETIME2 NOT NULL CONSTRAINT [tbPriceListUpload_fdUploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [fdPriceDate] DATETIME2,
    [fdEffectiveDate] DATETIME2 NOT NULL,
    [fdStatus] NVARCHAR(20) NOT NULL CONSTRAINT [tbPriceListUpload_fdStatus_df] DEFAULT 'PARSED',
    [fdWarnings] NVARCHAR(max),
    [fdRawSnapshot] NVARCHAR(max),
    CONSTRAINT [tbPriceListUpload_pkey] PRIMARY KEY CLUSTERED ([fdId])
);

-- CreateTable
CREATE TABLE [dbo].[tbPriceListItem] (
    [fdId] INT NOT NULL IDENTITY(1,1),
    [fdUploadId] INT NOT NULL,
    [fdSheetType] NVARCHAR(20) NOT NULL,
    [fdMode] NVARCHAR(20) NOT NULL,
    [fdBranch] NVARCHAR(20) NOT NULL,
    [fdTransitTime] NVARCHAR(50),
    [fdCategory] NVARCHAR(150) NOT NULL,
    [fdPrice] DECIMAL(14,2) NOT NULL,
    CONSTRAINT [tbPriceListItem_pkey] PRIMARY KEY CLUSTERED ([fdId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tbPriceListUpload_fdUploadedAt_idx] ON [dbo].[tbPriceListUpload]([fdUploadedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tbPriceListUpload_fdPriceDate_idx] ON [dbo].[tbPriceListUpload]([fdPriceDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tbPriceListUpload_fdEffectiveDate_idx] ON [dbo].[tbPriceListUpload]([fdEffectiveDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tbPriceListItem_fdUploadId_idx] ON [dbo].[tbPriceListItem]([fdUploadId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tbPriceListItem_fdSheetType_fdMode_fdBranch_fdCategory_idx] ON [dbo].[tbPriceListItem]([fdSheetType], [fdMode], [fdBranch], [fdCategory]);

-- AddForeignKey
ALTER TABLE [dbo].[tbUsers] ADD CONSTRAINT [tbUsers_fdRoleId_fkey] FOREIGN KEY ([fdRoleId]) REFERENCES [dbo].[tbRoles]([fdId]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tbRolePermissions] ADD CONSTRAINT [tbRolePermissions_fdRoleId_fkey] FOREIGN KEY ([fdRoleId]) REFERENCES [dbo].[tbRoles]([fdId]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[tbLocalCharges] ADD CONSTRAINT [tbLocalCharges_fdCreatedBy_fkey] FOREIGN KEY ([fdCreatedBy]) REFERENCES [dbo].[tbUsers]([fdId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tbLocalChargesDetail] ADD CONSTRAINT [tbLocalChargesDetail_fdLocalChargesId_fkey] FOREIGN KEY ([fdLocalChargesId]) REFERENCES [dbo].[tbLocalCharges]([fdId]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[tbLocalChargesLampiran] ADD CONSTRAINT [tbLocalChargesLampiran_fdLocalChargesId_fkey] FOREIGN KEY ([fdLocalChargesId]) REFERENCES [dbo].[tbLocalCharges]([fdId]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[tbLocalChargesLampiran] ADD CONSTRAINT [tbLocalChargesLampiran_fdUploadedBy_fkey] FOREIGN KEY ([fdUploadedBy]) REFERENCES [dbo].[tbUsers]([fdId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tbInspectionReport] ADD CONSTRAINT [tbInspectionReport_fdCreatedBy_fkey] FOREIGN KEY ([fdCreatedBy]) REFERENCES [dbo].[tbUsers]([fdId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tbInspectionReport] ADD CONSTRAINT [tbInspectionReport_fdListCode_fkey] FOREIGN KEY ([fdListCode]) REFERENCES [dbo].[vwtbEntryListCustomer]([fdListCode]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[tbInspectionReportLampiran] ADD CONSTRAINT [tbInspectionReportLampiran_fdInspectionReportId_fkey] FOREIGN KEY ([fdInspectionReportId]) REFERENCES [dbo].[tbInspectionReport]([fdId]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[tbInspectionReportLampiran] ADD CONSTRAINT [tbInspectionReportLampiran_fdUploadedBy_fkey] FOREIGN KEY ([fdUploadedBy]) REFERENCES [dbo].[tbUsers]([fdId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tbPriceListUpload] ADD CONSTRAINT [tbPriceListUpload_fdUploadedBy_fkey] FOREIGN KEY ([fdUploadedBy]) REFERENCES [dbo].[tbUsers]([fdId]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tbPriceListItem] ADD CONSTRAINT [tbPriceListItem_fdUploadId_fkey] FOREIGN KEY ([fdUploadId]) REFERENCES [dbo].[tbPriceListUpload]([fdId]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
