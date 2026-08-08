-- Keep the production deployment self-healing if an earlier reset removed the
-- reference currencies after the original seed migration had been recorded.
INSERT INTO "Currency" ("code", "name", "symbol", "decimalPlaces", "active", "createdAt", "updatedAt")
VALUES
  ('UGX', 'Ugandan Shilling', 'USh', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('USD', 'United States Dollar', '$', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('EUR', 'Euro', 'EUR', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('GBP', 'British Pound', 'GBP', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('KES', 'Kenyan Shilling', 'KSh', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('TZS', 'Tanzanian Shilling', 'TSh', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('RWF', 'Rwandan Franc', 'FRw', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "symbol" = EXCLUDED."symbol",
  "decimalPlaces" = EXCLUDED."decimalPlaces",
  "active" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "CompanyProfile" ("id", "singletonKey", "name", "email", "reportingCurrencyCode", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'primary', 'Hineni Tours', 'operations@hineni.tours', 'UGX', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("singletonKey") DO NOTHING;