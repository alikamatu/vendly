-- T02 Data Fix Script: PD-01 (Gas burner branded Apple, filed under Devices) + CT-01 (Devices description)
-- DO NOT RUN without owner review and explicit approval.
--
-- Review first (read-only):
-- SELECT id, title, brand, category, is_featured, status, description
-- FROM products
-- WHERE id = '7bf5cb97-9424-4257-ad52-fa2c4ad53bad';

BEGIN;

-- 1. PD-01: Clear unauthorized brand "Apple", move to "Home & Kitchen", unfeature until factual description is added.
UPDATE products
SET
  brand = NULL,
  category = 'Home & Kitchen',
  is_featured = false,
  updated_at = NOW()
WHERE id = '7bf5cb97-9424-4257-ad52-fa2c4ad53bad';

-- 2. PD-01: Expire any active Hot Sale / Featured promotion records for this product.
UPDATE product_promotion_payments
SET
  status = 'EXPIRED',
  updated_at = NOW()
WHERE product_id = '7bf5cb97-9424-4257-ad52-fa2c4ad53bad'
  AND status = 'ACTIVE';

-- 3. CT-01: Update Devices category description in DB if present.
UPDATE categories
SET
  description = 'Phones, computers, and electronics from verified sellers.',
  updated_at = NOW()
WHERE LOWER(name) = 'devices';

COMMIT;
