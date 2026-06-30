// @ts-nocheck
import { Hono } from 'hono';
import { prisma } from '../db/prisma';
import { saveFile, deleteFile, saveAvatar } from '../services/fileService';
import { authMiddleware } from '../middleware/authMiddleware';
import { logger } from '../lib/logger';
import fs from 'fs';
import path from 'path';

const lampiranRoutes = new Hono();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Serve protected file
lampiranRoutes.get('/download/:filename', authMiddleware, async (c) => {
  const filename = c.req.param('filename');
  
  let lampiran: any = await prisma.tbLocalChargesLampiran.findFirst({
    where: {
      fdPath: {
        endsWith: filename,
      },
    },
  });

  if (!lampiran) {
    lampiran = await prisma.tbInspectionReportLampiran.findFirst({
      where: {
        fdPath: {
          endsWith: filename,
        },
      },
    });
  }

  if (!lampiran) {
    return c.json({ message: 'File not found in database' }, 404);
  }

  const absolutePath = path.resolve(UPLOAD_DIR, lampiran.fdPath);
  
  if (!fs.existsSync(absolutePath)) {
    return c.json({ message: 'File not found on disk' }, 404);
  }

  const fileStream = fs.createReadStream(absolutePath);
  
  // Determine Content-Disposition
  const isDownload = c.req.query('download') === '1';
  const disposition = isDownload ? `attachment; filename="${lampiran.fdNamaFile}"` : 'inline';
  
  c.header('Content-Type', lampiran.fdMimeType);
  c.header('Content-Disposition', disposition);
  
  return c.body(fileStream as any);
});

// Delete file
lampiranRoutes.delete('/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'));

  let lampiran: any = await prisma.tbLocalChargesLampiran.findUnique({
    where: { fdId: id },
  });

  let isInspectionReport = false;

  if (!lampiran) {
    lampiran = await prisma.tbInspectionReportLampiran.findUnique({
      where: { fdId: id },
    });
    isInspectionReport = !!lampiran;
  }

  if (!lampiran) {
    return c.json({ message: 'Attachment not found' }, 404);
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete DB record
      if (isInspectionReport) {
        await tx.tbInspectionReportLampiran.delete({ where: { fdId: id } });
      } else {
        await tx.tbLocalChargesLampiran.delete({ where: { fdId: id } });
      }
      // 2. Delete Physical File
      deleteFile(lampiran.fdPath);
    });

    return c.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    logger.error('Error deleting attachment:', error);
    return c.json({ message: 'Failed to delete attachment' }, 500);
  }
});

// Upload file to local charge
lampiranRoutes.post('/local-charges/:id', authMiddleware, async (c) => {
  const localChargesId = Number(c.req.param('id'));
  const body = await c.req.parseBody();
  const file = body['file'] as File;

  if (!file) {
    return c.json({ message: 'No file uploaded' }, 400);
  }

  // Ensure local charge exists
  const localCharge = await prisma.tbLocalCharges.findUnique({
    where: { fdId: localChargesId },
  });

  if (!localCharge) {
    return c.json({ message: 'Local Charge form not found' }, 404);
  }

  try {
    const jwtPayload = c.get('jwtPayload');
    const savedFileInfo = await saveFile(file, localChargesId);

    const newLampiran = await prisma.tbLocalChargesLampiran.create({
      data: {
        fdLocalChargesId: localChargesId,
        fdNamaFile: savedFileInfo.name,
        fdNamaFileSimpan: savedFileInfo.savedName,
        fdPath: savedFileInfo.path,
        fdMimeType: savedFileInfo.type,
        fdUkuranBytes: savedFileInfo.size,
        fdUploadedBy: parseInt(jwtPayload.sub),
      },
    });

    // Map output to what frontend expects
    return c.json({
      fdId: newLampiran.fdId,
      fdFileName: newLampiran.fdNamaFile,
      fdFilePath: newLampiran.fdPath,
      fdMimeType: newLampiran.fdMimeType,
      fdFileSize: Number(newLampiran.fdUkuranBytes)
    }, 201);
  } catch (error: any) {
    logger.error('Error uploading file:', error);
    return c.json({ message: error.message || 'Failed to upload file' }, 400);
  }
});

// Upload file to inspection report
lampiranRoutes.post('/inspection-reports/:id', authMiddleware, async (c) => {
  const reportId = Number(c.req.param('id'));
  const body = await c.req.parseBody();
  const file = body['file'] as File;

  if (!file) {
    return c.json({ message: 'No file uploaded' }, 400);
  }

  const report = await prisma.tbInspectionReport.findUnique({
    where: { fdId: reportId },
  });

  if (!report) {
    return c.json({ message: 'Inspection Report not found' }, 404);
  }

  try {
    const jwtPayload = c.get('jwtPayload');
    const savedFileInfo = await saveFile(file, reportId);

    const newLampiran = await prisma.tbInspectionReportLampiran.create({
      data: {
        fdInspectionReportId: reportId,
        fdNamaFile: savedFileInfo.name,
        fdNamaFileSimpan: savedFileInfo.savedName,
        fdPath: savedFileInfo.path,
        fdMimeType: savedFileInfo.type,
        fdUkuranBytes: savedFileInfo.size,
        fdUploadedBy: parseInt(jwtPayload.sub),
      },
    });

    return c.json({
      fdId: newLampiran.fdId,
      fdFileName: newLampiran.fdNamaFile,
      fdFilePath: newLampiran.fdPath,
      fdMimeType: newLampiran.fdMimeType,
      fdFileSize: Number(newLampiran.fdUkuranBytes)
    }, 201);
  } catch (error: any) {
    logger.error('Error uploading file:', error);
    return c.json({ message: error.message || 'Failed to upload file' }, 400);
  }
});

// Upload avatar
lampiranRoutes.post('/avatar', authMiddleware, async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'] as File;

  if (!file) {
    return c.json({ message: 'No file uploaded' }, 400);
  }

  try {
    const path = await saveAvatar(file);
    // Since avatars don't go to database (we just store url in user table), 
    // we just return the url string that the frontend can save.
    // The backend runs on port 3001, so we return a relative path
    return c.json({
      url: `/api/v1/lampiran/download/avatars/${path.split('/').pop()}`
    }, 201);
  } catch (error: any) {
    logger.error('Error uploading avatar:', error);
    return c.json({ message: error.message || 'Failed to upload avatar' }, 400);
  }
});

// For avatars, we need a generic download endpoint because it doesn't exist in tbLocalChargesLampiran
lampiranRoutes.get('/download/avatars/:filename', async (c) => {
  const filename = c.req.param('filename');
  const absolutePath = path.resolve(UPLOAD_DIR, 'avatars', filename);
  
  if (!fs.existsSync(absolutePath)) {
    return c.json({ message: 'File not found' }, 404);
  }
  
  const fileStream = fs.createReadStream(absolutePath);
  return c.body(fileStream as any);
});

export default lampiranRoutes;
