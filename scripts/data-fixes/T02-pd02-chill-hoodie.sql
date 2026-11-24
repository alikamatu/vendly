-- T02 Data Fix Script: PD-02 (Chill Hoodie branded Nike, tagged "hoddie")
-- DO NOT RUN without owner review and explicit approval.
--
-- Review first (read-only):
-- SELECT id, title, brand, category, tags, description
-- FROM products
-- WHERE id = '9cc108c2-c213-4743-bf63-e78447592488';

BEGIN;

-- Clear unauthorized brand "Nike" (unless seller proves authorization) and fix typo tag "hoddie" -> "hoodie".
UPDATE products
SET
  brand = NULL,
  tags = array_replace(tags, 'hoddie', 'hoodie'),
  updated_at = NOW()
WHERE id = '9cc108c2-c213-4743-bf63-e78447592488';

COMMIT;
