import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool;
  private adapter: PrismaPg;

  constructor() {
    // Initialize PostgreSQL pool and Prisma driver adapter
    // Strip sslmode from the URL so pg doesn't force rejectUnauthorized: true
    // when connecting to Supabase pooled connection (self-signed cert in chain)
    const rawUrl = process.env.DATABASE_URL || '';
    const connectionString = rawUrl
      .replace(/([?&])sslmode=[^&]+(&|$)/, '$1')
      .replace(/[?&]$/, '');

    const pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    const adapter = new PrismaPg(pool);

    super({
      log: ['query', 'info', 'warn', 'error'],
      adapter,
    });

    this.pool = pool;
    this.adapter = adapter;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
