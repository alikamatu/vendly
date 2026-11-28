ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "seller_experience_prompted_at" TIMESTAMP(3);

DO $$ BEGIN
  CREATE TYPE "SellerExperienceStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "seller_experience_reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "seller_id" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "body" TEXT NOT NULL,
  "status" "SellerExperienceStatus" NOT NULL DEFAULT 'PENDING',
  "reviewed_by" UUID,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seller_experience_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "seller_experience_reviews_user_id_key"
  ON "seller_experience_reviews"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "seller_experience_reviews_seller_id_key"
  ON "seller_experience_reviews"("seller_id");
CREATE INDEX IF NOT EXISTS "seller_experience_reviews_status_created_at_idx"
  ON "seller_experience_reviews"("status", "created_at" DESC);

DO $$ BEGIN
  ALTER TABLE "seller_experience_reviews"
    ADD CONSTRAINT "seller_experience_reviews_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "seller_experience_reviews"
    ADD CONSTRAINT "seller_experience_reviews_seller_id_fkey"
    FOREIGN KEY ("seller_id") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "seller_experience_reviews"
    ADD CONSTRAINT "seller_experience_reviews_reviewed_by_fkey"
    FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
