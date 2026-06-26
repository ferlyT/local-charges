import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/authMiddleware';
import { requirePermission } from '../middleware/permissionMiddleware';

const usersRoutes = new Hono();

// All user management routes require auth
usersRoutes.use('*', authMiddleware);

// Middleware to check if user has manage users permission
usersRoutes.use('*', requirePermission('users:manage'));

// GET /api/v1/users - List all users
usersRoutes.get('/', async (c) => {
  try {
    const users = await prisma.tbUsers.findMany({
      select: {
        fdId: true,
        fdNama: true,
        fdUsername: true,
        fdRoleId: true,
        role: { select: { fdNama: true } },
        fdAktif: true,
        fdCreatedAt: true,
      },
      orderBy: {
        fdCreatedAt: 'desc'
      }
    });
    
    const formattedUsers = users.map(u => ({
      ...u,
      fdRole: u.role?.fdNama || 'user'
    }));

    return c.json({
      message: 'Success retrieving users',
      data: formattedUsers
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ message: 'Failed to fetch users' }, 500);
  }
});

// GET /api/v1/users/:id - Get user detail
usersRoutes.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ message: 'Invalid ID' }, 400);

  const user = await prisma.tbUsers.findUnique({
    where: { fdId: id },
    select: {
      fdId: true,
      fdNama: true,
      fdUsername: true,
      fdRoleId: true,
      role: { select: { fdNama: true } },
      fdAktif: true,
      fdCreatedAt: true,
    }
  });

  if (!user) return c.json({ message: 'User not found' }, 404);

  return c.json({
    message: 'Success retrieving user',
    data: {
      ...user,
      fdRole: user.role?.fdNama || 'user'
    }
  });
});

// PUT /api/v1/users/:id/status - Toggle user active status
const statusSchema = z.object({
  fdAktif: z.boolean(),
});

usersRoutes.put('/:id/status', zValidator('json', statusSchema), async (c) => {
  const id = parseInt(c.req.param('id'));
  const { fdAktif } = c.req.valid('json');

  if (isNaN(id)) {
    return c.json({ message: 'Invalid ID' }, 400);
  }

  // Prevent admin from deactivating themselves
  const payload = c.get('jwtPayload');
  if (parseInt(payload.sub) === id && !fdAktif) {
    return c.json({ message: 'Cannot deactivate your own account' }, 400);
  }

  try {
    const updatedUser = await prisma.tbUsers.update({
      where: { fdId: id },
      data: { fdAktif },
      select: {
        fdId: true,
        fdNama: true,
        fdUsername: true,
        role: { select: { fdNama: true } },
        fdAktif: true,
      }
    });

    return c.json({
      message: 'User status updated successfully',
      data: {
        ...updatedUser,
        fdRole: updatedUser.role?.fdNama || 'user'
      }
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return c.json({ message: 'Failed to update user status' }, 500);
  }
});

// PUT /api/v1/users/:id/role - Change user role
const roleSchema = z.object({
  fdRoleId: z.number(),
});

usersRoutes.put('/:id/role', zValidator('json', roleSchema), async (c) => {
  const id = parseInt(c.req.param('id'));
  const { fdRoleId } = c.req.valid('json');

  if (isNaN(id)) return c.json({ message: 'Invalid ID' }, 400);

  const payload = c.get('jwtPayload');
  if (parseInt(payload.sub) === id) {
    return c.json({ message: 'Cannot change your own role' }, 400);
  }

  try {
    const updatedUser = await prisma.tbUsers.update({
      where: { fdId: id },
      data: { fdRoleId },
      include: { role: true }
    });

    return c.json({
      message: 'User role updated successfully',
      data: {
        ...updatedUser,
        fdRole: updatedUser.role?.fdNama || 'user'
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return c.json({ message: 'Failed to update user role' }, 500);
  }
});

export default usersRoutes;
