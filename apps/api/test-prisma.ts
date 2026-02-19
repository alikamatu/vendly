import { PrismaClient } from '@prisma/client';
try {
  const client = new PrismaClient({ log: ['query'] });
  console.log('PrismaClient initialized successfully');
} catch (e) {
  console.error(e);
}
