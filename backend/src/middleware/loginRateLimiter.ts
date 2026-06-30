// @ts-nocheck
import { rateLimiter } from 'hono-rate-limiter';
import { logger } from '../lib/logger';

export const loginRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
  standardHeaders: "draft-6", // draft-6: `RateLimit` header; draft-7: combined `RateLimit` header
  keyGenerator: (c) => {
    return c.req.header('x-forwarded-for')?.split(',')[0].trim()
      || c.req.header('x-real-ip')
      || c.env?.incoming?.socket?.remoteAddress // For node/bun environments directly
      || 'unknown';
  },
  handler: (c) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() || c.env?.incoming?.socket?.remoteAddress || 'unknown';
    // We try to grab the username from body if possible, but body parsing might be async, 
    // so we just log the blocked attempt by IP.
    logger.warn(`[AUTH] Login blocked | ip="${ip}" | reason="rate limit exceeded"`);
    
    return c.json(
      { message: 'Too many login attempts. Please try again in 15 minutes.' },
      429
    );
  }
});
