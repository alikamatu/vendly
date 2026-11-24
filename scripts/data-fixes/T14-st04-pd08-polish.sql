-- T14 Data Fix Script: ST-04 (Store typos & thin bios) + PD-08 (Italian shoes incomplete listing)
-- DO NOT RUN without seller confirmation and owner approval.
-- See scripts/data-fixes/seller-requests.md for outreach templates.
--
-- Review first (read-only):
-- SELECT store_link, store_name, area, bio, logo_url
-- FROM seller_profiles
-- WHERE store_link IN ('dmens-wear', 'mimis-world-trendz', 'the-hoodies');
--
-- SELECT id, title, description, condition, attributes
-- FROM products
-- WHERE id = '48265a0c-2857-4e65-a4d8-d2471974132a';

BEGIN;

-- 1. ST-04: D'Men's wear area typo ("Kaneshi" -> "Kaneshie") — confirm with seller first
UPDATE seller_profiles
SET
  area = REPLACE(area, 'Kaneshi', 'Kaneshie'),
  updated_at = NOW()
WHERE store_link = 'dmens-wear'
  AND area LIKE '%Kaneshi%'
  AND area NOT LIKE '%Kaneshie%';

-- 2. ST-04: Replace thin bios once confirmed by sellers
-- UPDATE seller_profiles
-- SET bio = 'REPLACE_WITH_CONFIRMED_BIO', updated_at = NOW()
-- WHERE store_link = 'mimis-world-trendz';
--
-- UPDATE seller_profiles
-- SET bio = 'REPLACE_WITH_CONFIRMED_BIO', updated_at = NOW()
-- WHERE store_link = 'the-hoodies';

-- 3. PD-08: Italian shoes listing — replace placeholders after seller reply
UPDATE products
SET
  title = 'REPLACE_WITH_SPECIFIC_SHOE_TITLE',
  description = 'REPLACE_WITH_SELLER_DESCRIPTION_MIN_20_CHARS',
  attributes = COALESCE(attributes, '{}'::jsonb)
    || jsonb_build_object(
      'size', 'REPLACE_WITH_EU_UK_US_SHOE_SIZE',
      'color', 'REPLACE_WITH_CONFIRMED_COLOR',
      'material', 'REPLACE_WITH_CONFIRMED_MATERIAL',
      'gender', 'Men'
    ),
  updated_at = NOW()
WHERE id = '48265a0c-2857-4e65-a4d8-d2471974132a';

COMMIT;
