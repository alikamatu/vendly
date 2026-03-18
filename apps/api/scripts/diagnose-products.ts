import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    console.log(`Total Products: ${products.length}`);
    const statusCounts = products.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Status Counts:', statusCounts);
    console.log('Product Details:', products.map(p => ({ id: p.id.toString(), title: p.title, status: p.status })));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
