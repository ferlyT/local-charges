// @ts-nocheck
import { prisma } from '../src/db/prisma';
import bcrypt from 'bcrypt';

async function main() {
  // 1. Seed roles + permissions (idempotent)
  await prisma.tbRolePermissions.deleteMany();

  const adminRole = await prisma.tbRoles.upsert({
    where: { fdNama: 'admin' },
    update: { fdDeskripsi: 'Administrator system' },
    create: { fdNama: 'admin', fdDeskripsi: 'Administrator system' },
  });

  const adminPermissions = [
    'local_charges:read', 'local_charges:create', 'local_charges:edit', 'local_charges:delete',
    'inspection_reports:read', 'inspection_reports:create', 'inspection_reports:edit', 'inspection_reports:delete',
    'users:manage',
    'pricelist:read', 'pricelist:upload', 'pricelist:view',
  ];
  for (const p of adminPermissions) {
    await prisma.tbRolePermissions.create({ data: { fdRoleId: adminRole.fdId, fdPermission: p } });
  }

  const userRole = await prisma.tbRoles.upsert({
    where: { fdNama: 'user' },
    update: { fdDeskripsi: 'Regular user' },
    create: { fdNama: 'user', fdDeskripsi: 'Regular user' },
  });

  const userPermissions = [
    'local_charges:read', 'local_charges:create', 'local_charges:edit',
    'inspection_reports:read', 'inspection_reports:create', 'inspection_reports:edit',
    'pricelist:read', 'pricelist:view',
  ];
  for (const p of userPermissions) {
    await prisma.tbRolePermissions.create({ data: { fdRoleId: userRole.fdId, fdPermission: p } });
  }

  console.log('✅ Roles & permissions seeded.');

  // 2. Seed admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.tbUsers.upsert({
    where: { fdUsername: 'admin' },
    update: { fdRoleId: adminRole.fdId, fdAktif: true },
    create: {
      fdNama: 'Administrator',
      fdUsername: 'admin',
      fdPassword: hashedPassword,
      fdAktif: true,
      fdRoleId: adminRole.fdId,
    },
  });

  console.log(`✅ Admin user ready: ${admin.fdUsername} (id: ${admin.fdId})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
