import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/authMiddleware';

const rolesRoutes = new Hono();

// All role management routes require auth and admin
rolesRoutes.use('*', authMiddleware);

const requireManageRoles = async (c: any, next: any) => {
  const payload = c.get('jwtPayload');
  if (payload.role !== 'admin' && !payload.permissions?.includes('roles:manage')) {
    return c.json({ message: 'Forbidden. Role management permission required.' }, 403);
  }
  await next();
};

rolesRoutes.use('*', requireManageRoles);

// GET /api/v1/roles - List all roles with permissions and user count
rolesRoutes.get('/', async (c) => {
  try {
    const roles = await prisma.tbRoles.findMany({
      include: {
        permissions: true,
        _count: {
          select: { users: true }
        }
      },
      orderBy: { fdCreatedAt: 'asc' }
    });

    return c.json({
      message: 'Success retrieving roles',
      data: roles.map(r => ({
        ...r,
        permissions: r.permissions.map(p => p.fdPermission),
        userCount: r._count.users
      }))
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return c.json({ message: 'Failed to fetch roles' }, 500);
  }
});

// POST /api/v1/roles - Create new role
const roleSchema = z.object({
  fdNama: z.string().min(1, 'Role name is required').regex(/^[a-z0-9_-]+$/, 'Only lowercase, numbers, _, -'),
  fdDeskripsi: z.string().nullable().optional(),
  permissions: z.array(z.string()),
});

rolesRoutes.post('/', zValidator('json', roleSchema), async (c) => {
  const { fdNama, fdDeskripsi, permissions } = c.req.valid('json');

  const existingRole = await prisma.tbRoles.findUnique({ where: { fdNama } });
  if (existingRole) return c.json({ message: 'Role name already exists' }, 400);

  try {
    const newRole = await prisma.tbRoles.create({
      data: {
        fdNama,
        fdDeskripsi,
        permissions: {
          create: permissions.map((p: string) => ({ fdPermission: p }))
        }
      },
      include: { permissions: true }
    });

    return c.json({
      message: 'Role created successfully',
      data: {
        ...newRole,
        permissions: newRole.permissions.map(p => p.fdPermission),
        userCount: 0
      }
    }, 201);
  } catch (error) {
    console.error('Error creating role:', error);
    return c.json({ message: 'Failed to create role' }, 500);
  }
});

// PUT /api/v1/roles/:id - Update role
rolesRoutes.put('/:id', zValidator('json', roleSchema), async (c) => {
  const id = parseInt(c.req.param('id'));
  const { fdNama, fdDeskripsi, permissions } = c.req.valid('json');

  if (isNaN(id)) return c.json({ message: 'Invalid ID' }, 400);

  const role = await prisma.tbRoles.findUnique({ where: { fdId: id } });
  if (!role) return c.json({ message: 'Role not found' }, 404);
  
  if (role.fdNama === 'admin' && fdNama !== 'admin') {
     return c.json({ message: 'Cannot rename the core admin role' }, 400);
  }

  try {
    // Delete old permissions and recreate (easiest way to sync)
    await prisma.tbRolePermissions.deleteMany({ where: { fdRoleId: id } });

    const updatedRole = await prisma.tbRoles.update({
      where: { fdId: id },
      data: {
        fdNama,
        fdDeskripsi,
        permissions: {
          create: permissions.map((p: string) => ({ fdPermission: p }))
        }
      },
      include: {
        permissions: true,
        _count: { select: { users: true } }
      }
    });

    return c.json({
      message: 'Role updated successfully',
      data: {
        ...updatedRole,
        permissions: updatedRole.permissions.map(p => p.fdPermission),
        userCount: updatedRole._count.users
      }
    });
  } catch (error) {
    console.error('Error updating role:', error);
    return c.json({ message: 'Failed to update role' }, 500);
  }
});

// DELETE /api/v1/roles/:id - Delete role
rolesRoutes.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ message: 'Invalid ID' }, 400);

  const role = await prisma.tbRoles.findUnique({ 
    where: { fdId: id },
    include: { _count: { select: { users: true } } }
  });
  
  if (!role) return c.json({ message: 'Role not found' }, 404);
  
  if (role.fdNama === 'admin' || role.fdNama === 'user') {
    return c.json({ message: 'Cannot delete core roles' }, 400);
  }

  if (role._count.users > 0) {
    return c.json({ message: 'Cannot delete role because it is still assigned to users' }, 400);
  }

  try {
    await prisma.tbRoles.delete({ where: { fdId: id } });
    return c.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    return c.json({ message: 'Failed to delete role' }, 500);
  }
});

export default rolesRoutes;
