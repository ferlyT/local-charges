/**
 * Script diagnostik: cek user di database dan test password
 * Jalankan: bun run scripts/check-users.ts
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

// Username dan password yang dicoba saat login
const TEST_USERNAME = 'ferly';
const TEST_PASSWORDS = ['ferly123', 'ferly', '123456', 'password', 'admin123', 'Ferly123', 'ferly@123'];

async function main() {
  console.log('\n=== CHECK DATABASE CONNECTION ===');
  try {
    await prisma.$connect();
    console.log('✅ DB Connected successfully');
  } catch (e: any) {
    console.error('❌ DB Connection FAILED:', e.message);
    process.exit(1);
  }

  console.log('\n=== ALL USERS IN tbUsers ===');
  const users = await prisma.tbUsers.findMany({
    select: {
      fdId: true,
      fdNama: true,
      fdUsername: true,
      fdAktif: true,
      fdRoleId: true,
      fdPassword: true,
      role: { select: { fdNama: true } },
    },
  });

  if (users.length === 0) {
    console.log('⚠️  NO USERS FOUND IN DATABASE!');
    console.log('   → Run the seed script to create an admin user.');
  } else {
    for (const u of users) {
      console.log(`\n  User: ${u.fdUsername} (ID: ${u.fdId})`);
      console.log(`    Nama   : ${u.fdNama}`);
      console.log(`    Aktif  : ${u.fdAktif}`);
      console.log(`    RoleId : ${u.fdRoleId ?? 'NULL (no role assigned!)'}`);
      console.log(`    Role   : ${u.role?.fdNama ?? 'NULL (role not found!)'}`);
      console.log(`    PassHash: ${u.fdPassword?.substring(0, 20)}...`);
    }
  }

  console.log(`\n=== TEST LOGIN: username="${TEST_USERNAME}" ===`);
  const testUser = await prisma.tbUsers.findUnique({
    where: { fdUsername: TEST_USERNAME },
  });

  if (!testUser) {
    console.log(`❌ User "${TEST_USERNAME}" NOT FOUND in database`);
  } else {
    console.log(`✅ User found: ${testUser.fdNama}`);
    console.log(`   fdAktif: ${testUser.fdAktif}`);
    console.log(`   Hash   : ${testUser.fdPassword?.substring(0, 30)}...`);
    console.log(`\n   Testing passwords:`);

    let found = false;
    for (const pwd of TEST_PASSWORDS) {
      const match = await bcrypt.compare(pwd, testUser.fdPassword);
      console.log(`   "${pwd}" → ${match ? '✅ MATCH!' : '❌'}`);
      if (match) { found = true; break; }
    }

    if (!found) {
      console.log('\n   ⚠️  None of the tested passwords match.');
      console.log('   → Perlu reset password via scripts/reset-password.ts');
    }
  }
}

main()
  .catch((e) => {
    console.error('\n❌ ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
