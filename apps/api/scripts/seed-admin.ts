import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  const email = process.env.ADMIN_NOTIFY_EMAIL || 'alikamatu14@gmail.com';
  const phone = process.env.ADMIN_NOTIFY_PHONE || '+233534065652';
  const password = process.env.ADMIN_SEED_PASSWORD || 'Admin@123';
  const password_hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'ADMIN',
      is_verified: true,
      password_hash,
      phone_e164: phone,
      phone_verified_at: new Date(),
    },
    create: {
      email,
      password_hash,
      full_name: 'Admin',
      school: 'Admin',
      role: 'ADMIN',
      is_verified: true,
      phone_e164: phone,
      phone_verified_at: new Date(),
    },
  });

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: 'ADMIN' },
    secret,
    { algorithm: 'HS256', expiresIn: '365d' },
  );

  console.log(`ADMIN_TOKEN=${token}`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
