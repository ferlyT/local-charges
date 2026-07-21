BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[tbPriceListUploadBranch] (
    [fdId] INT NOT NULL IDENTITY(1,1),
    [fdUploadId] INT NOT NULL,
    [fdBranch] NVARCHAR(20) NOT NULL,
    [fdMarkingCode] NVARCHAR(30),
    CONSTRAINT [tbPriceListUploadBranch_pkey] PRIMARY KEY CLUSTERED ([fdId]),
    CONSTRAINT [tbPriceListUploadBranch_fdUploadId_fdBranch_key] UNIQUE NONCLUSTERED ([fdUploadId],[fdBranch])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tbPriceListUploadBranch_fdBranch_idx] ON [dbo].[tbPriceListUploadBranch]([fdBranch]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tbPriceListUploadBranch_fdMarkingCode_idx] ON [dbo].[tbPriceListUploadBranch]([fdMarkingCode]);

-- AddForeignKey
ALTER TABLE [dbo].[tbPriceListUploadBranch] ADD CONSTRAINT [tbPriceListUploadBranch_fdUploadId_fkey] FOREIGN KEY ([fdUploadId]) REFERENCES [dbo].[tbPriceListUpload]([fdId]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
