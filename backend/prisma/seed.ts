import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const adapter = new PrismaMssql({
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_DATABASE || 'LogistikDB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const adminExists = await prisma.tbUsers.findUnique({
    where: { fdUsername: 'admin' },
  });

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.tbUsers.create({
      data: {
        fdNama: 'Administrator',
        fdUsername: 'admin',
        fdPassword: hashedPassword,
        fdRole: 'admin',
        fdAktif: true,
      },
    });
    console.log('Admin user seeded:', admin.fdUsername);
  } else {
    console.log('Admin user already exists.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
