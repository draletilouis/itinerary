UPDATE "OperationalTask"
SET "mandatory" = FALSE
WHERE "title" IN (
  'Confirm accommodation suppliers',
  'Confirm activity suppliers',
  'Confirm transport suppliers'
);
