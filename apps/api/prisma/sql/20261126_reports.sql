-- Verndly Trust & Safety Reports (Products & Sellers)
-- Idempotent PostgreSQL migration matching apps/api/prisma/schema.prisma

DO $$ BEGIN
  CREATE TYPE "ReportTargetType" AS ENUM ('PRODUCT', 'SELLER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportReason" AS ENUM (
    'COUNTERFEIT',
    'MISLEADING',
    'PROHIBITED_ITEM',
    'SCAM_FRAUD',
    'HARASSMENT',
    'SPAM',
    'OFFENSIVE_CONTENT',
    'INACCURATE_PRICING',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportResolutionAction" AS ENUM (
    'NONE',
    'WARNING_ISSUED',
    'PRODUCT_REJECTED',
    'PRODUCT_ARCHIVED',
    'SELLER_SUSPENDED',
    'DISMISSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "reports" (
  "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
  "reporter_id"       UUID NOT NULL,
  "target_type"       "ReportTargetType" NOT NULL,
  "product_id"        UUID,
  "seller_id"         UUID,
  "reason"            "ReportReason" NOT NULL,
  "details"           TEXT,
  "evidence_urls"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status"            "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "resolution_action" "ReportResolutionAction",
  "admin_notes"       TEXT,
  "reviewed_by"       UUID,
  "reviewed_at"       TIMESTAMP(3),
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "reports_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "reports_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "seller_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "reports_status_created_at_idx" ON "reports"("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "reports_target_type_status_created_at_idx" ON "reports"("target_type", "status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "reports_product_id_idx" ON "reports"("product_id");
CREATE INDEX IF NOT EXISTS "reports_seller_id_idx" ON "reports"("seller_id");
CREATE INDEX IF NOT EXISTS "reports_reporter_id_created_at_idx" ON "reports"("reporter_id", "created_at" DESC);
