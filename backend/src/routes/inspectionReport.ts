import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../db/prisma';
import { Prisma } from '@prisma/client';
import { generateInspectionReportNumber } from '../services/formNumberService';
import { authMiddleware } from '../middleware/authMiddleware';
import { logger } from '../lib/logger';
import { requirePermission } from '../middleware/permissionMiddleware';
import { deleteFile } from '../services/fileService';

const inspectionReportRoutes = new Hono();

// All routes require authentication
inspectionReportRoutes.use('*', authMiddleware);

// Validation Schemas
const createInspectionReportSchema = z.object({
  fdReportDate: z.string().datetime(),
  fdListCode: z.string().min(1),
  fdMarkingCode: z.string().min(1),
  fdMarkingNo: z.string().min(1),
  fdNamaCustomer: z.string().min(1),
  fdKeterangan: z.string().min(1),
  fdStatus: z.string().optional().default('1'),
});

// GET /lookup - Lookup entry list data
inspectionReportRoutes.get('/lookup', async (c) => {
  const search = c.req.query('search') || '';
  try {
    const results = await prisma.vwtbEntryListCustomer.findMany({
      where: search ? {
        OR: [
          { fdMarkingCode: { startsWith: search } },
          { fdMarkingNo: { startsWith: search } },
          { fdCustName: { contains: search } },
        ],
      } : undefined,
      take: 25
    });
    return c.json(results);
  } catch (error) {
    logger.error('Error looking up marking code:', error);
    return c.json({ message: 'Failed to lookup marking code' }, 500);
  }
});

// GET list with pagination and search
inspectionReportRoutes.get('/', async (c) => {
  const page = Number(c.req.query('page')) || 1;
  const limit = Number(c.req.query('limit')) || 20;
  const search = c.req.query('search') || '';
  const sortBy = c.req.query('sortBy') || 'fdCreatedAt';
  const sortOrder = c.req.query('sortOrder') === 'asc' ? 'asc' : 'desc';

  const allowedSortFields = ['fdReportNumber', 'fdReportDate', 'fdCreatedAt', 'fdNamaCustomer', 'fdMarkingCode', 'fdStatus'];
  const resolvedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'fdCreatedAt';

  const skip = (page - 1) * limit;

  try {
    const whereClause: any = {
      fdDeletedAt: null,
    };

    if (search) {
      whereClause.OR = [
        { fdReportNumber: { contains: search } },
        { fdNamaCustomer: { contains: search } },
        { fdMarkingCode: { contains: search } },
        { fdMarkingNo: { contains: search } },
      ];
    }

    const total = await prisma.tbInspectionReport.count({ where: whereClause });

    const data = await prisma.tbInspectionReport.findMany({
      where: whereClause,
      include: {
        user: { select: { fdNama: true } }
      },
      orderBy: { [resolvedSortBy]: sortOrder },
      skip,
      take: limit,
    });

    return c.json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching inspection reports:', error);
    return c.json({ message: 'Failed to fetch data' }, 500);
  }
});

// GET /trash - List soft deleted items (Admin only)
inspectionReportRoutes.get('/trash', requirePermission('local_charges:delete'), async (c) => {
  const page = Number(c.req.query('page')) || 1;
  const limit = Number(c.req.query('limit')) || 20;
  const skip = (page - 1) * limit;

  try {
    const total = await prisma.tbInspectionReport.count({
      where: { fdDeletedAt: { not: null } }
    });

    const data = await prisma.tbInspectionReport.findMany({
      where: { fdDeletedAt: { not: null } },
      include: {
        user: { select: { fdNama: true } },
      },
      orderBy: { fdDeletedAt: 'desc' },
      skip,
      take: limit,
    });

    return c.json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    logger.error('Error fetching trash:', error);
    return c.json({ message: 'Failed to fetch trash data' }, 500);
  }
});

// GET detail
inspectionReportRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ message: 'Invalid ID' }, 400);
  }

  const data = await prisma.tbInspectionReport.findFirst({
    where: { fdId: id, fdDeletedAt: null },
    include: {
      lampiran: true,
      user: { select: { fdNama: true } },
    },
  });

  if (!data) return c.json({ message: 'Not found' }, 404);

  // Map lampiran fields for frontend
  const mappedData = {
    ...data,
    lampiran: data.lampiran.map((l) => ({
      fdId: l.fdId,
      fdFileName: l.fdNamaFile,
      fdFilePath: l.fdPath,
      fdMimeType: l.fdMimeType,
      fdFileSize: Number(l.fdUkuranBytes),
    })),
  };

  return c.json(mappedData);
});

// POST create
inspectionReportRoutes.post('/', requirePermission('local_charges:create'), zValidator('json', createInspectionReportSchema), async (c) => {
  const body = c.req.valid('json');
  const jwtPayload = c.get('jwtPayload') as any;

  const fdReportNumber = await generateInspectionReportNumber();

  try {
    const newReport = await prisma.tbInspectionReport.create({
      data: {
        fdReportNumber,
        fdReportDate: new Date(body.fdReportDate),
        fdListCode: body.fdListCode,
        fdMarkingCode: body.fdMarkingCode,
        fdMarkingNo: body.fdMarkingNo,
        fdNamaCustomer: body.fdNamaCustomer,
        fdKeterangan: body.fdKeterangan,
        fdStatus: body.fdStatus || '1',
        fdCreatedBy: parseInt(jwtPayload.sub),
      }
    });

    return c.json(newReport, 201);
  } catch (error) {
    logger.error('Error creating inspection report:', error);
    return c.json({ message: 'Failed to create report' }, 500);
  }
});

// PUT update
inspectionReportRoutes.put('/:id', requirePermission('local_charges:edit'), zValidator('json', createInspectionReportSchema), async (c) => {
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');

  try {
    const updatedReport = await prisma.tbInspectionReport.update({
      where: { fdId: id },
      data: {
        fdReportDate: new Date(body.fdReportDate),
        fdListCode: body.fdListCode,
        fdMarkingCode: body.fdMarkingCode,
        fdMarkingNo: body.fdMarkingNo,
        fdNamaCustomer: body.fdNamaCustomer,
        fdKeterangan: body.fdKeterangan,
        fdStatus: body.fdStatus || '1',
        fdUpdatedAt: new Date(),
      }
    });

    return c.json(updatedReport);
  } catch (error) {
    logger.error('Error updating inspection report:', error);
    return c.json({ message: 'Failed to update report' }, 500);
  }
});

// DELETE (Soft delete)
inspectionReportRoutes.delete('/:id', requirePermission('local_charges:delete'), async (c) => {
  const id = Number(c.req.param('id'));

  try {
    await prisma.tbInspectionReport.update({
      where: { fdId: id },
      data: { fdDeletedAt: new Date() },
    });

    return c.json({ message: 'Deleted successfully' });
  } catch (error) {
    logger.error('Error soft deleting report:', error);
    return c.json({ message: 'Failed to delete report' }, 500);
  }
});


// PATCH /:id/restore - Restore soft deleted item (Admin only)
inspectionReportRoutes.patch('/:id/restore', requirePermission('local_charges:delete'), async (c) => {
  const id = Number(c.req.param('id'));

  try {
    const updated = await prisma.tbInspectionReport.update({
      where: { fdId: id },
      data: { fdDeletedAt: null },
    });
    return c.json(updated);
  } catch (error) {
    logger.error('Error restoring report:', error);
    return c.json({ message: 'Failed to restore report' }, 500);
  }
});

// DELETE /:id/permanent - Hard delete (Admin only)
inspectionReportRoutes.delete('/:id/permanent', requirePermission('local_charges:delete'), async (c) => {
  const id = Number(c.req.param('id'));

  try {
    // Check if the record exists and is soft deleted
    const record = await prisma.tbInspectionReport.findUnique({
      where: { fdId: id },
      include: { lampiran: true }
    });

    if (!record) {
      return c.json({ message: 'Record not found' }, 404);
    }

    if (!record.fdDeletedAt) {
      return c.json({ message: 'Record must be soft deleted first before permanent deletion' }, 400);
    }

    // Delete files physically
    for (const l of record.lampiran) {
      if (l.fdPath) {
        deleteFile(l.fdPath);
      }
    }

    // Use transaction to delete child records then parent
    await prisma.$transaction([
      prisma.tbInspectionReportLampiran.deleteMany({ where: { fdInspectionReportId: id } }),
      prisma.tbInspectionReport.delete({ where: { fdId: id } })
    ]);

    return c.json({ message: 'Permanently deleted' });
  } catch (error) {
    logger.error('Error permanently deleting report:', error);
    return c.json({ message: 'Failed to permanently delete report' }, 500);
  }
});

export default inspectionReportRoutes;
