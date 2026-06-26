import { prisma } from '../db/prisma';

export const requirePermission = (requiredPermission: string) => {
  return async (c: any, next: any) => {
    const payload = c.get('jwtPayload');
    const roleName = payload.role;
    
    // Core admin always bypasses permission checks
    if (roleName === 'admin') {
      await next();
      return;
    }
    
    const role = await prisma.tbRoles.findUnique({
      where: { fdNama: roleName },
      include: { permissions: true }
    });
    
    if (!role) {
      return c.json({ message: 'Forbidden. Role not found.' }, 403);
    }
    
    const hasPermission = role.permissions.some(p => p.fdPermission === requiredPermission);
    
    if (!hasPermission) {
      return c.json({ message: `Forbidden. Requires ${requiredPermission} permission.` }, 403);
    }
    
    await next();
  };
};
