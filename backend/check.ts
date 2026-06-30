import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "sqlserver://192.168.1.121:1433;database=WorkHubDB;user=sa;password=Sonus5779;encrypt=true;trustServerCertificate=true"
    }
  }
});
async function main() {
  const res = await prisma.vwtbEntryListCustomer.findFirst({
    where: { fdMarkingCode: { startsWith: 'SE' } }
  });
  console.log(JSON.stringify(res, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
