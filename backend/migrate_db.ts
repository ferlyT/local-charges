import * as sql from 'mssql';

const sqlConfig = {
    user: 'sa',
    password: 'Sonus5779',
    database: 'master',
    server: '192.168.1.121',
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const migrationScript = `
-- =====================================================================
-- STEP 1: CREATE DATABASE & BASE SCHEMAS
-- =====================================================================
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'WorkHubDB')
BEGIN
    CREATE DATABASE WorkHubDB;
END
GO
USE WorkHubDB;
GO

-- Create tbRoles
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tbRoles' and xtype='U')
BEGIN
CREATE TABLE tbRoles (
    fdId INT IDENTITY(1,1) PRIMARY KEY,
    fdNama VARCHAR(50) NOT NULL UNIQUE,
    fdDeskripsi VARCHAR(255) NULL,
    fdCreatedAt DATETIME DEFAULT GETDATE() NOT NULL
);
END
GO

-- Create tbUsers
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tbUsers' and xtype='U')
BEGIN
CREATE TABLE tbUsers (
    fdId INT IDENTITY(1,1) PRIMARY KEY,
    fdNama VARCHAR(100) NOT NULL,
    fdUsername VARCHAR(50) NOT NULL UNIQUE,
    fdPassword VARCHAR(255) NOT NULL,
    fdAktif BIT DEFAULT 1 NOT NULL,
    fdCreatedAt DATETIME DEFAULT GETDATE() NOT NULL,
    fdAvatar VARCHAR(500) NULL,
    fdRoleId INT NULL,
    FOREIGN KEY (fdRoleId) REFERENCES tbRoles(fdId)
);
END
GO

-- Create tbRolePermissions
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tbRolePermissions' and xtype='U')
BEGIN
CREATE TABLE tbRolePermissions (
    fdId INT IDENTITY(1,1) PRIMARY KEY,
    fdRoleId INT NOT NULL,
    fdPermission VARCHAR(100) NOT NULL,
    CONSTRAINT UQ_RolePermission UNIQUE (fdRoleId, fdPermission),
    FOREIGN KEY (fdRoleId) REFERENCES tbRoles(fdId) ON DELETE CASCADE
);
END
GO

-- Create tbLocalCharges
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tbLocalCharges' and xtype='U')
BEGIN
CREATE TABLE tbLocalCharges (
    fdId INT IDENTITY(1,1) PRIMARY KEY,
    fdNomorForm VARCHAR(30) NOT NULL UNIQUE,
    fdQty DECIMAL(10,3) NULL,
    fdSatuanQty VARCHAR(20) DEFAULT 'M3' NULL,
    fdStatus TINYINT DEFAULT 1 NOT NULL,
    fdDibuat VARCHAR(100) NULL,
    fdTglDibuat DATETIME NULL,
    fdDirequest VARCHAR(100) NULL,
    fdTglDirequest DATETIME NULL,
    fdBilling VARCHAR(100) NULL,
    fdTglBilling DATETIME NULL,
    fdAR VARCHAR(100) NULL,
    fdTglAR DATETIME NULL,
    fdDiketahui VARCHAR(100) NULL,
    fdTglDiketahui DATETIME NULL,
    fdCreatedBy INT NOT NULL,
    fdCreatedAt DATETIME DEFAULT GETDATE() NOT NULL,
    fdUpdatedAt DATETIME DEFAULT GETDATE() NOT NULL,
    fdDeletedAt DATETIME NULL,
    FOREIGN KEY (fdCreatedBy) REFERENCES tbUsers(fdId)
);
END
GO

-- Create tbLocalChargesDetail
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tbLocalChargesDetail' and xtype='U')
BEGIN
CREATE TABLE tbLocalChargesDetail (
    fdId INT IDENTITY(1,1) PRIMARY KEY,
    fdLocalChargesId INT NOT NULL,
    fdNo TINYINT NOT NULL,
    fdNamaCustomer VARCHAR(150) NOT NULL,
    fdMarking VARCHAR(100) NULL,
    fdNoReceipt VARCHAR(100) NULL,
    fdNoBilling VARCHAR(100) NULL,
    fdKeterangan VARCHAR(500) NULL,
    fdNoInputan VARCHAR(100) NULL,
    FOREIGN KEY (fdLocalChargesId) REFERENCES tbLocalCharges(fdId) ON DELETE CASCADE
);
END
GO

-- Create tbLocalChargesLampiran
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tbLocalChargesLampiran' and xtype='U')
BEGIN
CREATE TABLE tbLocalChargesLampiran (
    fdId INT IDENTITY(1,1) PRIMARY KEY,
    fdLocalChargesId INT NOT NULL,
    fdNamaFile VARCHAR(255) NOT NULL,
    fdNamaFileSimpan VARCHAR(255) NOT NULL,
    fdMimeType VARCHAR(100) NOT NULL,
    fdUkuranBytes BIGINT NOT NULL,
    fdPath VARCHAR(500) NOT NULL,
    fdUploadedBy INT NOT NULL,
    fdUploadedAt DATETIME DEFAULT GETDATE() NOT NULL,
    fdKeterangan VARCHAR(255) NULL,
    FOREIGN KEY (fdLocalChargesId) REFERENCES tbLocalCharges(fdId) ON DELETE CASCADE,
    FOREIGN KEY (fdUploadedBy) REFERENCES tbUsers(fdId)
);
END
GO

-- =====================================================================
-- STEP 2: CREATE NEW TABLES FOR INSPECTION REPORT
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tbInspectionReport' and xtype='U')
BEGIN
CREATE TABLE tbInspectionReport (
    fdId INT IDENTITY(1,1) PRIMARY KEY,
    fdReportNumber VARCHAR(30) NOT NULL UNIQUE,
    fdReportDate DATETIME NOT NULL,
    fdListCode CHAR(7) NOT NULL,
    fdMarkingCode CHAR(30) NOT NULL,
    fdMarkingNo CHAR(50) NOT NULL,
    fdNamaCustomer VARCHAR(150) NOT NULL,
    fdKeterangan VARCHAR(MAX) NOT NULL,
    fdStatus VARCHAR(1) DEFAULT '1' NOT NULL,
    fdCreatedBy INT NOT NULL,
    fdCreatedAt DATETIME DEFAULT GETDATE() NOT NULL,
    fdUpdatedAt DATETIME DEFAULT GETDATE() NOT NULL,
    fdDeletedAt DATETIME NULL,
    FOREIGN KEY (fdCreatedBy) REFERENCES tbUsers(fdId)
);
END
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tbInspectionReportLampiran' and xtype='U')
BEGIN
CREATE TABLE tbInspectionReportLampiran (
    fdId INT IDENTITY(1,1) PRIMARY KEY,
    fdInspectionReportId INT NOT NULL,
    fdNamaFile VARCHAR(255) NOT NULL,
    fdNamaFileSimpan VARCHAR(255) NOT NULL,
    fdMimeType VARCHAR(100) NOT NULL,
    fdUkuranBytes BIGINT NOT NULL,
    fdPath VARCHAR(500) NOT NULL,
    fdUploadedBy INT NOT NULL,
    fdUploadedAt DATETIME DEFAULT GETDATE() NOT NULL,
    fdKeterangan VARCHAR(255) NULL,
    FOREIGN KEY (fdInspectionReportId) REFERENCES tbInspectionReport(fdId) ON DELETE CASCADE,
    FOREIGN KEY (fdUploadedBy) REFERENCES tbUsers(fdId)
);
END
GO

-- =====================================================================
-- STEP 3: CREATE CROSS-DATABASE VIEW FOR LOGISTICS REFERENCE
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.views WHERE name = 'vwtbEntryListCustomer')
BEGIN
    EXEC('
    CREATE VIEW vwtbEntryListCustomer AS
    SELECT 
        e.fdListCode, 
        e.fdMarkingCode, 
        e.fdMarkingNo, 
        c.fdCustName
    FROM SEJDB2020.dbo.tbEntryList e
    LEFT JOIN SEJDB2020.dbo.tbCustomers c ON e.fdCustCode = c.fdCustCode;
    ');
END
GO

-- =====================================================================
-- STEP 4: MIGRATE DATA FROM LocalChargesDB TO WorkHubDB
-- =====================================================================
GO
USE WorkHubDB;
GO

IF NOT EXISTS (SELECT 1 FROM tbRoles)
BEGIN
    SET IDENTITY_INSERT tbRoles ON;
    INSERT INTO tbRoles (fdId, fdNama, fdDeskripsi, fdCreatedAt)
    SELECT fdId, fdNama, fdDeskripsi, fdCreatedAt FROM LocalChargesDB.dbo.tbRoles;
    SET IDENTITY_INSERT tbRoles OFF;
END
GO

IF NOT EXISTS (SELECT 1 FROM tbUsers)
BEGIN
    SET IDENTITY_INSERT tbUsers ON;
    INSERT INTO tbUsers (fdId, fdNama, fdUsername, fdPassword, fdAktif, fdCreatedAt, fdAvatar, fdRoleId)
    SELECT fdId, fdNama, fdUsername, fdPassword, fdAktif, fdCreatedAt, fdAvatar, fdRoleId FROM LocalChargesDB.dbo.tbUsers;
    SET IDENTITY_INSERT tbUsers OFF;
END
GO

IF NOT EXISTS (SELECT 1 FROM tbRolePermissions)
BEGIN
    SET IDENTITY_INSERT tbRolePermissions ON;
    INSERT INTO tbRolePermissions (fdId, fdRoleId, fdPermission)
    SELECT fdId, fdRoleId, fdPermission FROM LocalChargesDB.dbo.tbRolePermissions;
    SET IDENTITY_INSERT tbRolePermissions OFF;
END
GO

IF NOT EXISTS (SELECT 1 FROM tbLocalCharges)
BEGIN
    SET IDENTITY_INSERT tbLocalCharges ON;
    INSERT INTO tbLocalCharges (fdId, fdNomorForm, fdQty, fdSatuanQty, fdStatus, fdDibuat, fdTglDibuat, fdDirequest, fdTglDirequest, fdBilling, fdTglBilling, fdAR, fdTglAR, fdDiketahui, fdTglDiketahui, fdCreatedBy, fdCreatedAt, fdUpdatedAt, fdDeletedAt)
    SELECT fdId, fdNomorForm, fdQty, fdSatuanQty, fdStatus, fdDibuat, fdTglDibuat, fdDirequest, fdTglDirequest, fdBilling, fdTglBilling, fdAR, fdTglAR, fdDiketahui, fdTglDiketahui, fdCreatedBy, fdCreatedAt, fdUpdatedAt, fdDeletedAt FROM LocalChargesDB.dbo.tbLocalCharges;
    SET IDENTITY_INSERT tbLocalCharges OFF;
END
GO

IF NOT EXISTS (SELECT 1 FROM tbLocalChargesDetail)
BEGIN
    SET IDENTITY_INSERT tbLocalChargesDetail ON;
    INSERT INTO tbLocalChargesDetail (fdId, fdLocalChargesId, fdNo, fdNamaCustomer, fdMarking, fdNoReceipt, fdNoBilling, fdKeterangan, fdNoInputan)
    SELECT fdId, fdLocalChargesId, fdNo, fdNamaCustomer, fdMarking, fdNoReceipt, fdNoBilling, fdKeterangan, fdNoInputan FROM LocalChargesDB.dbo.tbLocalChargesDetail;
    SET IDENTITY_INSERT tbLocalChargesDetail OFF;
END
GO

IF NOT EXISTS (SELECT 1 FROM tbLocalChargesLampiran)
BEGIN
    SET IDENTITY_INSERT tbLocalChargesLampiran ON;
    INSERT INTO tbLocalChargesLampiran (fdId, fdLocalChargesId, fdNamaFile, fdNamaFileSimpan, fdMimeType, fdUkuranBytes, fdPath, fdUploadedBy, fdUploadedAt, fdKeterangan)
    SELECT fdId, fdLocalChargesId, fdNamaFile, fdNamaFileSimpan, fdMimeType, fdUkuranBytes, fdPath, fdUploadedBy, fdUploadedAt, fdKeterangan FROM LocalChargesDB.dbo.tbLocalChargesLampiran;
    SET IDENTITY_INSERT tbLocalChargesLampiran OFF;
END
GO
`;

async function runMigration() {
    try {
        console.log("Connecting to SQL Server...");
        const pool = await sql.connect(sqlConfig);
        console.log("Connected successfully.");

        const batches = migrationScript.split(/\nGO\b/i);
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim();
            if (batch) {
                console.log("Executing batch " + (i+1) + " / " + batches.length + "...");
                try {
                    await pool.request().query(batch);
                } catch (err) {
                    console.error("Error in batch " + (i+1) + ":");
                    console.error(batch);
                    console.error(err);
                    throw err;
                }
            }
        }

        console.log("Migration completed successfully!");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await sql.close();
    }
}

runMigration();
