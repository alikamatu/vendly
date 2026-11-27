-- Explicit seller verification flag on seller_profiles so users can skip
-- verification to set up their store while orders remain hard-blocked until approved.
ALTER TABLE "seller_profiles"
  ADD COLUMN IF NOT EXISTS "is_seller_verified" BOOLEAN NOT NULL DEFAULT false;

-- Backfill all existing live stores so zero current sellers are disrupted.
UPDATE "seller_profiles"
   SET "is_seller_verified" = true
 WHERE "is_seller_verified" = false;
