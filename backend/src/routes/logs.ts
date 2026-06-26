import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { logger } from '../lib/logger';

const logsRoutes = new Hono();

const logSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  componentStack: z.string().optional(),
  userAgent: z.string().optional(),
  url: z.string().optional(),
});

logsRoutes.post('/', zValidator('json', logSchema), async (c) => {
  const data = c.req.valid('json');

  logger.error('Client-side error:', {
    clientMessage: data.message,
    clientStack: data.stack,
    componentStack: data.componentStack,
    userAgent: data.userAgent,
    url: data.url,
    ip: c.req.header('x-forwarded-for') || c.env?.incoming?.socket?.remoteAddress || 'unknown'
  });

  return c.json({ success: true }, 201);
});

export default logsRoutes;
