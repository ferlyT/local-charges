import { prisma } from './src/db/prisma';
async function main() {
  const res = await prisma.vwtbEntryListCustomer.findFirst({
    where: { fdMarkingCode: { startsWith: 'SE' } }
  });
  console.log(JSON.stringify(res, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
