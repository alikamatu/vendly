import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "status_check";
      ALTER TABLE "products" ADD CONSTRAINT "status_check" CHECK (status IN ('draft', 'active', 'published', 'out_of_stock', 'archived', 'rejected'));
    `);
    console.log('Successfully added check constraint to products table');
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log('Constraint already exists. Skipping.');
    } else {
      console.error('Error adding constraint:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
