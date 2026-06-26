import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../db/prisma';
import bcrypt from 'bcrypt';
import { sign } from 'hono/jwt';
import { authMiddleware } from '../middleware/authMiddleware';
import { serializeUser } from '../lib/userSerializer';

const authRoutes = new Hono();

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined.');
}
const secret = process.env.JWT_SECRET;

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  nama: z.string().min(1, 'Nama is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { username, password } = c.req.valid('json');

  const user = await prisma.tbUsers.findUnique({
    where: { fdUsername: username },
    include: { role: { include: { permissions: true } } }
  });

  if (!user) {
    return c.json({ message: 'Invalid credentials' }, 401);
  }

  if (!user.fdAktif) {
    return c.json({ message: 'Account is pending admin approval or inactive' }, 403);
  }

  const isValidPassword = await bcrypt.compare(password, user.fdPassword);
  if (!isValidPassword) {
    return c.json({ message: 'Invalid credentials' }, 401);
  }

  const roleName = user.role?.fdNama || user.fdRole;
  const permissions = user.role?.permissions?.map(p => p.fdPermission) || [];

  const payload = {
    sub: user.fdId.toString(),
    username: user.fdUsername,
    role: roleName,
    permissions: permissions,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8, // 8 hours
  };

  const token = await sign(payload, secret);

  return c.json({
    message: 'Login successful',
    token,
    user: serializeUser(user, roleName, permissions),
  });
});

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { nama, username, password } = c.req.valid('json');

  // Check if username exists
  const existingUser = await prisma.tbUsers.findUnique({
    where: { fdUsername: username },
  });

  if (existingUser) {
    return c.json({ message: 'Username already taken' }, 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  const defaultRole = await prisma.tbRoles.findUnique({ where: { fdNama: 'user' } });

  // Create user
  const newUser = await prisma.tbUsers.create({
    data: {
      fdNama: nama,
      fdUsername: username,
      fdPassword: hashedPassword,
      fdRole: 'user', // legacy
      fdRoleId: defaultRole?.fdId,
      fdAktif: false, // User needs admin approval to login
    },
    include: { role: true }
  });

  const roleName = newUser.role?.fdNama || newUser.fdRole;
  const permissions = newUser.role?.permissions?.map((p: any) => p.fdPermission) || [];

  return c.json({
    message: 'Registration successful',
    user: serializeUser(newUser, roleName, permissions),
  }, 201);
});

// Protected routes for user profile management
authRoutes.use('/profile', authMiddleware);
authRoutes.use('/password', authMiddleware);

const profileSchema = z.object({
  nama: z.string().min(1, 'Name is required'),
  avatar: z.string().nullable().optional(),
});

authRoutes.put('/profile', zValidator('json', profileSchema), async (c) => {
  const payload = c.get('jwtPayload');
  const userId = parseInt(payload.sub);
  const { nama, avatar } = c.req.valid('json');

  const updatedUser = await prisma.tbUsers.update({
    where: { fdId: userId },
    data: { fdNama: nama, fdAvatar: avatar },
    include: { role: { include: { permissions: true } } }
  });

  const roleName = updatedUser.role?.fdNama || updatedUser.fdRole;
  const permissions = updatedUser.role?.permissions?.map(p => p.fdPermission) || [];

  return c.json({
    message: 'Profile updated successfully',
    user: serializeUser(updatedUser, roleName, permissions),
  });
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

authRoutes.put('/password', zValidator('json', passwordSchema), async (c) => {
  const payload = c.get('jwtPayload');
  const userId = parseInt(payload.sub);
  const { currentPassword, newPassword } = c.req.valid('json');

  const user = await prisma.tbUsers.findUnique({ where: { fdId: userId } });
  if (!user) return c.json({ message: 'User not found' }, 404);

  const isValid = await bcrypt.compare(currentPassword, user.fdPassword);
  if (!isValid) return c.json({ message: 'Incorrect current password' }, 400);

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.tbUsers.update({
    where: { fdId: userId },
    data: { fdPassword: hashedPassword }
  });

  return c.json({ message: 'Password updated successfully' });
});

export default authRoutes;
