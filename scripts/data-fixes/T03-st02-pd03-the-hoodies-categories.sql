-- T03 Data Fix Script: ST-02 & PD-03 (Recategorize African Dress and General hoodies under /s/the-hoodies)
-- DO NOT RUN without owner review and explicit approval.
--
-- Review first (read-only):
-- SELECT p.id, p.title, p.category, p.status, p.description
-- FROM products p
-- JOIN seller_profiles sp ON sp.id = p.seller_id
-- WHERE sp.store_link = 'the-hoodies';

BEGIN;

-- 1. PD-03 / ST-02: Move African Dress from Food & Beverages -> Fashion.
UPDATE products
SET
  category = 'Fashion',
  updated_at = NOW()
WHERE id = 'f71cd10f-9ec7-45d9-adce-61b9779340ce';

-- 2. ST-02: Recategorize the two General hoodies (Berrykey, VEOUNDK) under the-hoodies -> Fashion.
UPDATE products p
SET
  category = 'Fashion',
  updated_at = NOW()
FROM seller_profiles sp
WHERE p.seller_id = sp.id
  AND sp.store_link = 'the-hoodies'
  AND LOWER(p.category) = 'general';

COMMIT;
