/**
 * Script reset password user
 * Jalankan: bun run scripts/reset-password.ts
 * 
 * Edit USERNAME dan NEW_PASSWORD di bawah sebelum menjalankan.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import bcrypt from 'bcrypt';

const adapter = new PrismaMssql({
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_DATABASE || 'LocalChargesDB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
});

const prisma = new PrismaClient({ adapter });

// ← Ganti sesuai kebutuhan
const TARGET_USERNAME = 'ferly';
const NEW_PASSWORD = 'ferly123';

async function main() {
  console.log(`\n=== RESET PASSWORD: "${TARGET_USERNAME}" ===`);

  const user = await prisma.tbUsers.findUnique({
    where: { fdUsername: TARGET_USERNAME },
  });

  if (!user) {
    console.error(`❌ User "${TARGET_USERNAME}" tidak ditemukan!`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(NEW_PASSWORD, 10);
  await prisma.tbUsers.update({
    where: { fdUsername: TARGET_USERNAME },
    data: { fdPassword: hashed },
  });

  // Verifikasi
  const verify = await bcrypt.compare(NEW_PASSWORD, hashed);
  console.log(`✅ Password berhasil direset`);
  console.log(`   Username : ${TARGET_USERNAME}`);
  console.log(`   Password baru: ${NEW_PASSWORD}`);
  console.log(`   Verifikasi hash: ${verify ? '✅ OK' : '❌ GAGAL'}`);
}

main()
  .catch((e) => {
    console.error('\n❌ ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
