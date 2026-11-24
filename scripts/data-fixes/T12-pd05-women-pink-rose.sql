-- T12 Data Fix Script: PD-05 ("Women Pink and Rose White" mismatched attributes & empty description)
-- DO NOT RUN without seller confirmation and owner approval.
--
-- NEEDS-HUMAN (seller confirmation required before replacing placeholders):
--   1. Confirm exact garment type from the product photo (e.g., top, dress, two-piece set).
--   2. Confirm actual color (title says "Pink and Rose White", attribute currently says "Red").
--   3. Confirm gender ("Women's" — currently set to "Unisex").
--   4. Provide a factual description (>= 20 chars: fabric, fit, size L measurements).
--
-- Review first (read-only):
-- SELECT id, title, description, category, attributes, status
-- FROM products
-- WHERE id = '29e33ade-701f-4731-9394-71346e4b6244';

BEGIN;

UPDATE products
SET
  title = 'Women''s pink and rose top (REPLACE_WITH_CONFIRMED_GARMENT_TYPE)',
  description = 'REPLACE_WITH_SELLER_DESCRIPTION_MIN_20_CHARS',
  attributes = COALESCE(attributes, '{}'::jsonb)
    || jsonb_build_object(
      'gender', 'Women''s',
      'color', 'REPLACE_WITH_CONFIRMED_COLOR_FROM_PHOTO'
    ),
  updated_at = NOW()
WHERE id = '29e33ade-701f-4731-9394-71346e4b6244';

COMMIT;
