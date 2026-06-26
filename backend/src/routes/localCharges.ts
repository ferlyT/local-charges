import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../db/prisma';
import { Prisma } from '@prisma/client';
import { generateFormNumber } from '../services/formNumberService';
import { authMiddleware } from '../middleware/authMiddleware';
import { requirePermission } from '../middleware/permissionMiddleware';

const localChargesRoutes = new Hono();

// All routes require authentication
localChargesRoutes.use('*', authMiddleware);

// Validation Schemas
const detailSchema = z.object({
  fdNamaCustomer: z.string().min(1),
  fdMarking: z.string().nullable().optional(),
  fdNoReceipt: z.string().nullable().optional(),
  fdNoBilling: z.string().nullable().optional(),
  fdKeterangan: z.string().nullable().optional(),
  fdNoInputan: z.string().nullable().optional(),
});

// Helper function to validate fdNoInputan uniqueness
async function validateNoInputanUniqueness(details: any[], currentLocalChargesId?: number) {
  const noInputans = details
    .map(d => d.fdNoInputan)
    .filter(n => n && n.trim() !== '');

  if (noInputans.length === 0) return null;

  // Check for duplicates within the payload itself
  const uniqueNoInputans = new Set(noInputans);
  if (uniqueNoInputans.size !== noInputans.length) {
    return 'Terdapat duplikasi No. Inputan di dalam form ini.';
  }

  // Check against database
  const existingDetails = await prisma.tbLocalChargesDetail.findMany({
    where: {
      fdNoInputan: { in: noInputans },
      ...(currentLocalChargesId ? { fdLocalChargesId: { not: currentLocalChargesId } } : {})
    },
    include: {
      localCharges: {
        select: { fdDeletedAt: true }
      }
    }
  });

  // Filter out those belonging to deleted local charges
  const activeExistingDetails = existingDetails.filter(d => !d.localCharges?.fdDeletedAt);

  if (activeExistingDetails.length > 0) {
    const usedInputans = activeExistingDetails.map(d => d.fdNoInputan).join(', ');
    return `No. Inputan berikut sudah digunakan pada form lain: ${usedInputans}`;
  }

  return null;
}

const createLocalChargeSchema = z.object({
  fdQty: z.number().nullable().optional(),
  fdSatuanQty: z.string().nullable().optional(),
  details: z.array(detailSchema).min(1),
});

// GET list with pagination and search (Raw SQL for advanced sorting)
localChargesRoutes.get('/', async (c) => {
  const page = Number(c.req.query('page')) || 1;
  const limit = Number(c.req.query('limit')) || 20;
  const search = c.req.query('search') || '';
  const sortBy = c.req.query('sortBy') || 'fdCreatedAt';
  const sortOrder = c.req.query('sortOrder') === 'asc' ? 'asc' : 'desc';
  
  const allowedSortFields = ['fdNomorForm', 'fdStatus', 'fdCreatedAt', 'fdNamaCustomer', 'fdNoInputan'];
  const resolvedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'fdCreatedAt';
  
  const skip = (page - 1) * limit;

  const orderColumnMap: Record<string, string> = {
    fdNomorForm: 'lc.fdNomorForm',
    fdStatus: 'lc.fdStatus',
    fdCreatedAt: 'lc.fdCreatedAt',
    fdNamaCustomer: 'first_detail.fdNamaCustomer',
    fdNoInputan: 'first_detail.fdNoInputan'
  };
  
  const orderByClause = `${orderColumnMap[resolvedSortBy]} ${sortOrder.toUpperCase()}`;
  const searchPattern = search ? `%${search}%` : null;

  const rawQuery = Prisma.sql`
    SELECT 
      lc.fdId, COUNT(*) OVER() AS totalCount
    FROM tbLocalCharges lc
    OUTER APPLY (
      SELECT TOP 1 fdNamaCustomer, fdNoReceipt, fdNoBilling, fdMarking, fdNoInputan
      FROM tbLocalChargesDetail
      WHERE fdLocalChargesId = lc.fdId AND fdNo = 1
    ) AS first_detail
    WHERE lc.fdDeletedAt IS NULL
      ${searchPattern ? Prisma.sql`AND (
        lc.fdNomorForm LIKE ${searchPattern} OR
        first_detail.fdNamaCustomer LIKE ${searchPattern} OR
        first_detail.fdNoReceipt LIKE ${searchPattern} OR
        first_detail.fdNoBilling LIKE ${searchPattern} OR
        first_detail.fdMarking LIKE ${searchPattern} OR
        first_detail.fdNoInputan LIKE ${searchPattern}
      )` : Prisma.empty}
    ORDER BY ${Prisma.raw(orderByClause)}
    OFFSET ${skip} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

  const rawResults = await prisma.$queryRaw<{fdId: number, totalCount: bigint | number}[]>(rawQuery);

  const sortedIds = rawResults.map(r => r.fdId);
  const total = rawResults.length > 0 ? Number(rawResults[0].totalCount) : 0;

  let data: any[] = [];
  if (sortedIds.length > 0) {
    const unsortedData = await prisma.tbLocalCharges.findMany({
      where: { fdId: { in: sortedIds } },
      include: {
        user: { select: { fdNama: true } },
        details: { select: { fdNamaCustomer: true, fdNoInputan: true, fdMarking: true, fdNoReceipt: true, fdNoBilling: true }, take: 2 },
      }
    });

    // Hydrate in the exact order requested
    data = sortedIds.map(id => unsortedData.find(d => d.fdId === id)).filter(Boolean);
  }

  return c.json({
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /stats - Analytics summary
localChargesRoutes.get('/stats', async (c) => {
  try {
    // Total counts by status
    const statusCounts = await prisma.tbLocalCharges.groupBy({
      by: ['fdStatus'],
      where: { fdDeletedAt: null },
      _count: { fdId: true },
    });

    // Total forms all time
    const totalForms = await prisma.tbLocalCharges.count({
      where: { fdDeletedAt: null },
    });

    // Total forms this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalThisMonth = await prisma.tbLocalCharges.count({
      where: { fdDeletedAt: null, fdCreatedAt: { gte: startOfMonth } },
    });

    // Total forms last month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const totalLastMonth = await prisma.tbLocalCharges.count({
      where: { fdDeletedAt: null, fdCreatedAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
    });

    // Top 5 customers by form count (from details)
    const topCustomers = await prisma.tbLocalChargesDetail.groupBy({
      by: ['fdNamaCustomer'],
      where: {
        fdNamaCustomer: { not: '' },
        localCharges: { fdDeletedAt: null }
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
      FROM tbLocalCharges
      WHERE fdDeletedAt IS NULL
        AND fdCreatedAt >= DATEADD(MONTH, -5, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
      GROUP BY FORMAT(fdCreatedAt, 'yyyy-MM')
      ORDER BY month ASC
    `);

    // Status breakdown
    const statusMap: Record<number, string> = { 1: 'Draft', 2: 'Done' };
    const byStatus = statusCounts.reduce((acc: Record<string, number>, s) => {
      acc[statusMap[s.fdStatus] || `Status ${s.fdStatus}`] = s._count.fdId;
      return acc;
    }, {});

    return c.json({
      totalForms,
      totalThisMonth,
      totalLastMonth,
      growthPercent: totalLastMonth === 0
        ? (totalThisMonth > 0 ? 100 : 0)
        : Math.round(((totalThisMonth - totalLastMonth) / totalLastMonth) * 100),
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
    console.error('Stats error:', error);
    return c.json({ message: 'Failed to fetch stats' }, 500);
  }
});

// GET detail
localChargesRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));

  const data = await prisma.tbLocalCharges.findFirst({
    where: { fdId: id, fdDeletedAt: null },
    include: {
      details: true,
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
localChargesRoutes.post('/', requirePermission('local_charges:create'), zValidator('json', createLocalChargeSchema), async (c) => {
  const body = c.req.valid('json');
  const jwtPayload = c.get('jwtPayload');
  
  const validationError = await validateNoInputanUniqueness(body.details);
  if (validationError) {
    return c.json({ message: validationError }, 400);
  }

  const fdNomorForm = await generateFormNumber();
  const hasBilling = body.details.some((d: any) => d.fdNoBilling && d.fdNoBilling.trim() !== '');

  const newCharge = await prisma.tbLocalCharges.create({
    data: {
      fdNomorForm,
      fdQty: body.fdQty,
      fdSatuanQty: body.fdSatuanQty || 'M3',
      fdStatus: hasBilling ? 2 : 1,
      user: {
        connect: { fdId: parseInt(jwtPayload.sub) }
      },
      details: {
        create: body.details.map((detail, index) => ({
          ...detail,
          fdNo: index + 1,
        })),
      },
    },
    include: {
      details: true,
    },
  });

  return c.json(newCharge, 201);
});

// PUT update
localChargesRoutes.put('/:id', requirePermission('local_charges:edit'), zValidator('json', createLocalChargeSchema), async (c) => {
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');

  const validationError = await validateNoInputanUniqueness(body.details, id);
  if (validationError) {
    return c.json({ message: validationError }, 400);
  }

  // We use a transaction to delete existing details and create new ones
  const updatedCharge = await prisma.$transaction(async (tx) => {
    // Delete existing details
    await tx.tbLocalChargesDetail.deleteMany({
      where: { fdLocalChargesId: id },
    });

    const hasBilling = body.details.some((d: any) => d.fdNoBilling && d.fdNoBilling.trim() !== '');

    // Update main record and create new details
    return await tx.tbLocalCharges.update({
      where: { fdId: id },
      data: {
        fdStatus: hasBilling ? 2 : 1,
        fdQty: body.fdQty,
        fdSatuanQty: body.fdSatuanQty,
        fdUpdatedAt: new Date(),
        details: {
          create: body.details.map((detail, index) => ({
            ...detail,
            fdNo: index + 1,
          })),
        },
      },
      include: { details: true },
    });
  });

  return c.json(updatedCharge);
});

// DELETE (Soft delete)
localChargesRoutes.delete('/:id', requirePermission('local_charges:delete'), async (c) => {
  const id = Number(c.req.param('id'));

  await prisma.tbLocalCharges.update({
    where: { fdId: id },
    data: { fdDeletedAt: new Date() },
  });

  return c.json({ message: 'Deleted successfully' });
});

export default localChargesRoutes;
