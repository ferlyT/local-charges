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
  fdListCode: z.string().optional().default(''),
  fdMarkingCode: z.string().optional().default(''),
  fdMarkingNo: z.string().optional().default(''),
  fdNamaCustomer: z.string().min(1, 'Customer Name is required'),
  fdTerima: z.string().nullable().optional(),
  fdKeterangan: z.string().optional().default(''),
  fdStatus: z.string().optional().default('1'),
});

// GET /stats - Dashboard statistics
inspectionReportRoutes.get('/stats', requirePermission('inspection_reports:read'), async (c) => {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [totalReports, totalThisMonth, totalLastMonth, statusGroups] = await Promise.all([
      prisma.tbInspectionReport.count({ where: { fdDeletedAt: null } }),
      prisma.tbInspectionReport.count({ where: { fdDeletedAt: null, fdCreatedAt: { gte: startOfThisMonth } } }),
      prisma.tbInspectionReport.count({ where: { fdDeletedAt: null, fdCreatedAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.tbInspectionReport.groupBy({
        by: ['fdStatus'],
        where: { fdDeletedAt: null },
        _count: { fdId: true }
      })
    ]);

    let growthPercent = 0;
    if (totalLastMonth > 0) {
      growthPercent = ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100;
    } else if (totalThisMonth > 0) {
      growthPercent = 100;
    }

    // Top 5 customers
    const topCustomers = await prisma.tbInspectionReport.groupBy({
      by: ['fdNamaCustomer'],
      where: {
        fdNamaCustomer: { not: '' },
        fdDeletedAt: null
      },
      _count: { fdId: true },
      orderBy: { _count: { fdId: 'desc' } },
      take: 5,
    });

    // Monthly trend: last 6 months
    const monthlyTrend = await prisma.$queryRaw<{ month: string; count: bigint }[]>(Prisma.sql`
      SELECT 
        FORMAT(fdCreatedAt, 'yyyy-MM') AS month,
        COUNT(*) AS count
      FROM tbInspectionReport
      WHERE fdDeletedAt IS NULL
        AND fdCreatedAt >= DATEADD(MONTH, -5, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
      GROUP BY FORMAT(fdCreatedAt, 'yyyy-MM')
      ORDER BY month ASC
    `);

    const statusMap: Record<string, string> = { '1': 'Draft', '2': 'Done' };
    const byStatus = statusGroups.reduce((acc, curr) => {
      const statusName = statusMap[curr.fdStatus.toString()] || `Status ${curr.fdStatus}`;
      acc[statusName] = curr._count.fdId;
      return acc;
    }, {} as Record<string, number>);

    return c.json({
      totalForms: totalReports,
      totalThisMonth,
      totalLastMonth,
      growthPercent: Math.round(growthPercent),
      byStatus,
      topCustomers: topCustomers.map(c => ({
        name: c.fdNamaCustomer,
        count: c._count.fdId,
      })),
      monthlyTrend: monthlyTrend.map(r => ({
        month: r.month,
        count: Number(r.count),
      })),
    });
  } catch (error) {
    logger.error('Error fetching inspection report stats:', error);
    return c.json({ message: 'Failed to fetch stats' }, 500);
  }
});

// // GET /lookup - Lookup entry list data
// inspectionReportRoutes.get('/lookup', requirePermission('inspection_reports:read'), async (c) => {
//   const search = c.req.query('search') || '';
//   try {
//     const results = await prisma.vwtbEntryListCustomer.findMany({
//       where: search ? {
//         OR: [
//           { fdMarkingCode: { startsWith: search } },
//           { fdMarkingNo: { startsWith: search } },
//           { fdCustName: { contains: search } },
//         ],
//       } : undefined,
//       take: 25
//     });
//     return c.json(results);
//   } catch (error) {
//     logger.error('Error looking up marking code:', error);
//     return c.json({ message: 'Failed to lookup marking code' }, 500);
//   }
// });

// GET /lookup - Lookup entry list data
inspectionReportRoutes.get(
  '/lookup',
  requirePermission('inspection_reports:read'),
  async (c) => {
    const search = c.req.query('search')?.trim() ?? '';
    const markingCode = c.req.query('markingCode')?.trim() ?? '';
    const custSearch = c.req.query('custSearch')?.trim() ?? '';
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 20;

    try {
      let whereClause: any;

      if (markingCode) {
        // Two-stage filter mode: markingCode is fixed, optionally filter by custSearch
        whereClause = {
          fdMarkingCode: { startsWith: markingCode },
          ...(custSearch ? {
            OR: [
              { fdCustName: { contains: custSearch } },
              { fdMarkingNo: { contains: custSearch } },
            ]
          } : {}),
        };
      } else if (search) {
        // Standard OR search across all relevant fields
        whereClause = {
          OR: [
            { fdCustName: { contains: search } },
            { fdMarkingCode: { startsWith: search } },
            { fdMarkingNo: { startsWith: search } },
          ],
        };
      }

      const results = await prisma.vwtbEntryListCustomer.findMany({
        where: whereClause,
        orderBy: [
          { fdCustName: 'asc' },
          { fdMarkingCode: 'asc' },
          { fdMarkingNo: 'asc' },
          { fdTerima: 'asc' },
          { fdListCode: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      });

      return c.json(results);
    } catch (error) {
      logger.error('Error looking up marking code:', error);
      return c.json(
        { message: 'Failed to lookup marking code' },
        500
      );
    }
  }
);

// GET list with pagination and search
inspectionReportRoutes.get('/', requirePermission('inspection_reports:read'), async (c) => {
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
inspectionReportRoutes.get('/trash', requirePermission('inspection_reports:delete'), async (c) => {
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
inspectionReportRoutes.get('/:id', requirePermission('inspection_reports:read'), async (c) => {
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
inspectionReportRoutes.post('/', requirePermission('inspection_reports:create'), zValidator('json', createInspectionReportSchema), async (c) => {
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
        fdTerima: body.fdTerima,
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
inspectionReportRoutes.put('/:id', requirePermission('inspection_reports:edit'), zValidator('json', createInspectionReportSchema), async (c) => {
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
        fdTerima: body.fdTerima,
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
inspectionReportRoutes.delete('/:id', requirePermission('inspection_reports:delete'), async (c) => {
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
inspectionReportRoutes.patch('/:id/restore', requirePermission('inspection_reports:delete'), async (c) => {
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
inspectionReportRoutes.delete('/:id/permanent', requirePermission('inspection_reports:delete'), async (c) => {
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
