-- Account Lifecycle Migration (Disable Account + 14-Day Seller Deletion + Product Hard-Delete)
-- Idempotent SQL for production Postgres (matches apps/api/prisma/schema.prisma).

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "disabled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletion_requested_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletion_scheduled_for" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletion_reminder_sent_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "users_deletion_scheduled_for_idx"
  ON "users" ("deletion_scheduled_for")
  WHERE "deletion_scheduled_for" IS NOT NULL;

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "product_title" TEXT,
  ALTER COLUMN "product_id" DROP NOT NULL;

-- Backfill product_title snapshot for existing order items
UPDATE "order_items" oi
SET "product_title" = p."title"
FROM "products" p
WHERE oi."product_id" = p."id" AND oi."product_title" IS NULL;

-- Make order_items.product_id & variant_id ON DELETE SET NULL
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_product_id_fkey";
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_variant_id_fkey";
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_variant_id_fkey"
  FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Make product_promotion_payments.product_id nullable + ON DELETE SET NULL
ALTER TABLE "product_promotion_payments"
  ALTER COLUMN "product_id" DROP NOT NULL;
ALTER TABLE "product_promotion_payments" DROP CONSTRAINT IF EXISTS "product_promotion_payments_product_id_fkey";
ALTER TABLE "product_promotion_payments"
  ADD CONSTRAINT "product_promotion_payments_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Cascade deletes on favorites and reviews when a product is hard-deleted
ALTER TABLE "favorites" DROP CONSTRAINT IF EXISTS "favorites_product_id_fkey";
ALTER TABLE "favorites"
  ADD CONSTRAINT "favorites_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "favorites" DROP CONSTRAINT IF EXISTS "favorites_user_id_fkey";
ALTER TABLE "favorites"
  ADD CONSTRAINT "favorites_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_product_id_fkey";
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
