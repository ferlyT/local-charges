import { prisma } from './src/db/prisma';
import { Prisma } from '@prisma/client';

async function test() {
  try {
    console.log('1. Testing statusCounts');
    const statusCounts = await prisma.tbLocalCharges.groupBy({
      by: ['fdStatus'],
      where: { fdDeletedAt: null },
      _count: { fdId: true },
    });
    console.log(statusCounts);

    console.log('2. Testing topCustomers');
    const topCustomers = await prisma.tbLocalChargesDetail.groupBy({
      by: ['fdNamaCustomer'],
      where: {
        fdNamaCustomer: { not: '' },
        localCharges: { fdDeletedAt: null }
      },
      _count: { fdId: true },
      orderBy: { _count: { fdId: 'desc' } },
      take: 5,
    });
    console.log(topCustomers);

    console.log('3. Testing monthlyTrend raw SQL');
    const monthlyTrend = await prisma.$queryRaw<{ month: string; count: bigint }[]>(Prisma.sql`
      SELECT 
        FORMAT(fdCreatedAt, 'yyyy-MM') AS month,
        COUNT(*) AS count
      FROM tbLocalCharges
      WHERE fdDeletedAt IS NULL
        AND fdCreatedAt >= DATEADD(MONTH, -5, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
      GROUP BY FORMAT(fdCreatedAt, 'yyyy-MM')
      ORDER BY month ASC
    `);
    console.log(monthlyTrend);
    console.log('Done!');
  } catch (err) {
    console.error('ERROR OCCURRED:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
