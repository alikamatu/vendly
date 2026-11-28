import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
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
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
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
    await this.applyPendingSql();
    await this.$connect();
  }

  /**
   * Loose SQL files in prisma/migrations are not Prisma Migrate folders, so
   * Render never applied them. Run each file once and record it. The older
   * seller-verified script backfills every store, so if that column is
   * already present it is recorded without running again.
   */
  private async applyPendingSql() {
    const dir = join(process.cwd(), 'prisma', 'migrations');
    let files: string[];
    try {
      files = (await readdir(dir))
        .filter((name) => name.endsWith('.sql'))
        .sort();
    } catch {
      this.logger.warn(`No SQL migrations at ${dir}`);
      return;
    }
    if (files.length === 0) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_sql_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const applied = await this.pool.query<{ filename: string }>(
      'SELECT filename FROM schema_sql_migrations',
    );
    const done = new Set(applied.rows.map((row) => row.filename));

    const verified = await this.pool.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'seller_profiles'
          AND column_name = 'is_seller_verified'
      ) AS exists
    `);
    const legacy = '20261127_seller_verified_flag.sql';
    if (
      verified.rows[0]?.exists &&
      files.includes(legacy) &&
      !done.has(legacy)
    ) {
      await this.pool.query(
        'INSERT INTO schema_sql_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
        [legacy],
      );
      done.add(legacy);
    }

    for (const name of files) {
      if (done.has(name)) continue;
      const sql = await readFile(join(dir, name), 'utf8');
      await this.pool.query(sql);
      await this.pool.query(
        'INSERT INTO schema_sql_migrations (filename) VALUES ($1)',
        [name],
      );
      this.logger.log(`Applied SQL migration ${name}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
