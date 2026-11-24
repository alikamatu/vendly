-- T03 Data Fix Script: ST-01 (Location typo on /s/the-hoodies: "Airpot 225")
-- NEEDS-HUMAN: Confirm exact area spelling ("Airport 225") with the seller before running.
-- DO NOT RUN without owner review and explicit approval.
--
-- Review first (read-only):
-- SELECT id, store_name, store_link, location, area
-- FROM seller_profiles
-- WHERE store_link = 'the-hoodies';

BEGIN;

UPDATE seller_profiles
SET
  area = 'Airport 225',
  updated_at = NOW()
WHERE store_link = 'the-hoodies'
  AND area = 'Airpot 225';

COMMIT;
