-- T09 Data Fix Script: PD-04 (Out-of-stock VEOUNDK Men Loose Zip Up Hooded Jacket)
-- DO NOT RUN without owner review and explicit approval.
-- NEEDS-HUMAN: Confirm with the seller whether to keep this listing (with restocked quantity)
-- or archive/remove it since quantity_available is currently 0.
--
-- Review first (read-only):
-- SELECT id, title, category, status, quantity_available, price, original_price
-- FROM products
-- WHERE id = 'c5537034-4bfd-4460-b1bc-c469ab1827bb';

BEGIN;

-- Update category from General -> Fashion and replace supplier-code title with plain copy.
UPDATE products
SET
  category = 'Fashion',
  title = 'Men''s black zip-up hooded jacket',
  updated_at = NOW()
WHERE id = 'c5537034-4bfd-4460-b1bc-c469ab1827bb';

-- Optional (only if seller confirms item is discontinued):
-- UPDATE products
-- SET status = 'archived', updated_at = NOW()
-- WHERE id = 'c5537034-4bfd-4460-b1bc-c469ab1827bb' AND quantity_available = 0;

COMMIT;
