// @ts-nocheck
import { Hono } from 'hono';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/authMiddleware';
import { logger } from '../lib/logger';

const employeesRoutes = new Hono();

employeesRoutes.use('*', authMiddleware);

/**
 * GET /api/v1/employees?role=direquest|billing|ar
 * Fetches employee list from SEJDB2020.dbo.tbEmployees via cross-database query.
 *
 * - direquest → fdEmpTitle IN ('CSO', 'SHIPMENT')
 * - billing   → fdEmpTitle = 'BILLING'
 * - ar        → fdEmpTitle = 'FINANCE'
 */
employeesRoutes.get('/', async (c) => {
  const role = c.req.query('role') || 'direquest';

  let titleFilter: string;

  if (role === 'billing') {
    titleFilter = `fdEmpTitle = 'BILLING'`;
  } else if (role === 'ar') {
    titleFilter = `fdEmpTitle = 'FINANCE'`;
  } else {
    // default: direquest
    titleFilter = `fdEmpTitle IN ('CSO', 'SHIPMENT')`;
  }

  try {
    const results: any[] = await prisma.$queryRawUnsafe(
      `SELECT fdEmpName, fdEmpTitle
       FROM [SEJDB2020].[dbo].[tbEmployees]
       WHERE fdStatus = 1 AND ${titleFilter}
       ORDER BY fdEmpName`
    );

    return c.json(results);
  } catch (error) {
    logger.error('Error fetching employees:', error);
    return c.json({ message: 'Failed to fetch employees' }, 500);
  }
});

export default employeesRoutes;
