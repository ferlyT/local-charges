// @ts-nocheck
import { prisma } from '../src/db/prisma';

async function main() {
  // Hapus semua permission lama agar di-seed ulang dengan yang baru
  await prisma.tbRolePermissions.deleteMany();

  const adminRole = await prisma.tbRoles.upsert({
    where: { fdNama: 'admin' },
    update: {
      permissions: {
        create: [
          { fdPermission: 'local_charges:read' },
          { fdPermission: 'local_charges:create' },
          { fdPermission: 'local_charges:edit' },
          { fdPermission: 'local_charges:delete' },
          { fdPermission: 'inspection_reports:read' },
          { fdPermission: 'inspection_reports:create' },
          { fdPermission: 'inspection_reports:edit' },
          { fdPermission: 'inspection_reports:delete' },
          { fdPermission: 'users:manage' },
        ],
      },
    },
    create: {
      fdNama: 'admin',
      fdDeskripsi: 'Administrator system',
      permissions: {
        create: [
          { fdPermission: 'local_charges:read' },
          { fdPermission: 'local_charges:create' },
          { fdPermission: 'local_charges:edit' },
          { fdPermission: 'local_charges:delete' },
          { fdPermission: 'inspection_reports:read' },
          { fdPermission: 'inspection_reports:create' },
          { fdPermission: 'inspection_reports:edit' },
          { fdPermission: 'inspection_reports:delete' },
          { fdPermission: 'users:manage' },
        ],
      },
    },
  });

  const userRole = await prisma.tbRoles.upsert({
    where: { fdNama: 'user' },
    update: {
      permissions: {
        create: [
          { fdPermission: 'local_charges:read' },
          { fdPermission: 'local_charges:create' },
          { fdPermission: 'local_charges:edit' },
          { fdPermission: 'inspection_reports:read' },
          { fdPermission: 'inspection_reports:create' },
          { fdPermission: 'inspection_reports:edit' },
        ],
      },
    },
    create: {
      fdNama: 'user',
      fdDeskripsi: 'Regular user',
      permissions: {
        create: [
          { fdPermission: 'local_charges:read' },
          { fdPermission: 'local_charges:create' },
          { fdPermission: 'local_charges:edit' },
          { fdPermission: 'inspection_reports:read' },
          { fdPermission: 'inspection_reports:create' },
          { fdPermission: 'inspection_reports:edit' },
        ],
      },
    },
  });

  // Update existing users
  const users = await prisma.tbUsers.findMany();
  for (const user of users) {
    if (user.fdRole === 'admin') {
      await prisma.tbUsers.update({ where: { fdId: user.fdId }, data: { fdRoleId: adminRole.fdId } });
    } else {
      await prisma.tbUsers.update({ where: { fdId: user.fdId }, data: { fdRoleId: userRole.fdId } });
    }
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
