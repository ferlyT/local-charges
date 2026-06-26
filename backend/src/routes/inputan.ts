import { Hono } from 'hono';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/authMiddleware';
import { logger } from '../lib/logger';

const inputanRoutes = new Hono();

inputanRoutes.use('*', authMiddleware);

inputanRoutes.get('/', async (c) => {
  const search = c.req.query('search') || '';

  try {
    const safeSearch = search.replace(/'/g, "''");
    const results: any[] = await prisma.$queryRawUnsafe(`EXEC [SEJDB2020].[dbo].[sp_SearchInputan_App_local_charges] @fdListCode = '${safeSearch}'`);
    
    return c.json(results);
  } catch (error) {
    logger.error('Error fetching inputan:', error);
    return c.json({ message: 'Failed to fetch data' }, 500);
  }
});

export default inputanRoutes;
