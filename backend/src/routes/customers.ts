import { Hono } from 'hono';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/authMiddleware';
import { logger } from '../lib/logger';

const customersRoutes = new Hono();

customersRoutes.use('*', authMiddleware);

customersRoutes.get('/', async (c) => {
  const search = c.req.query('search') || '';
  
  try {
    let query = `SELECT TOP 50 fdCustName FROM [SEJDB2020].[dbo].[tbCustomers]`;
    
    // Add simple LIKE search if search param is provided
    if (search) {
      // Basic SQL injection prevention: removing single quotes
      const safeSearch = search.replace(/'/g, "''");
      query += ` WHERE fdCustName LIKE '%${safeSearch}%'`;
    }
    
    query += ` ORDER BY fdCustName ASC`;

    // Execute raw query using Prisma
    const customers: any[] = await prisma.$queryRawUnsafe(query);
    
    return c.json(customers);
  } catch (error) {
    logger.error('Error fetching customers:', error);
    return c.json({ message: 'Failed to fetch customers from SEJDB2020' }, 500);
  }
});

export default customersRoutes;
