import { jwt } from 'hono/jwt';

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined.');
}

export const authMiddleware = jwt({
  secret: process.env.JWT_SECRET,
  alg: 'HS256',
});
