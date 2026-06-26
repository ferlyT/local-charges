BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[tbUsers] (
    [fdId] INT NOT NULL IDENTITY(1,1),
    [fdNama] VARCHAR(100) NOT NULL,
    [fdUsername] VARCHAR(50) NOT NULL,
    [fdPassword] VARCHAR(255) NOT NULL,
    [fdRole] VARCHAR(30) NOT NULL CONSTRAINT [tbUsers_fdRole_df] DEFAULT 'user',
    [fdAktif] BIT NOT NULL CONSTRAINT [tbUsers_fdAktif_df] DEFAULT 1,
    [fdCreatedAt] DATETIME2 NOT NULL CONSTRAINT [tbUsers_fdCreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tbUsers_pkey] PRIMARY KEY CLUSTERED ([fdId]),
    CONSTRAINT [tbUsers_fdUsername_key] UNIQUE NONCLUSTERED ([fdUsername])
);

-- CreateTable
CREATE TABLE [dbo].[tbLocalCharges] (
    [fdId] INT NOT NULL IDENTITY(1,1),
    [fdNomorForm] VARCHAR(30) NOT NULL,
    [fdTo] VARCHAR(100) NOT NULL,
    [fdSalesSPW] VARCHAR(100),
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

-- AddForeignKey
ALTER TABLE [dbo].[tbLocalCharges] ADD CONSTRAINT [tbLocalCharges_fdCreatedBy_fkey] FOREIGN KEY ([fdCreatedBy]) REFERENCES [dbo].[tbUsers]([fdId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tbLocalChargesDetail] ADD CONSTRAINT [tbLocalChargesDetail_fdLocalChargesId_fkey] FOREIGN KEY ([fdLocalChargesId]) REFERENCES [dbo].[tbLocalCharges]([fdId]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[tbLocalChargesLampiran] ADD CONSTRAINT [tbLocalChargesLampiran_fdLocalChargesId_fkey] FOREIGN KEY ([fdLocalChargesId]) REFERENCES [dbo].[tbLocalCharges]([fdId]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[tbLocalChargesLampiran] ADD CONSTRAINT [tbLocalChargesLampiran_fdUploadedBy_fkey] FOREIGN KEY ([fdUploadedBy]) REFERENCES [dbo].[tbUsers]([fdId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
