CREATE TABLE "SupplierCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "SupplierCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupplierCategory_name_key" ON "SupplierCategory"("name");
CREATE INDEX "SupplierCategory_status_name_idx" ON "SupplierCategory"("status", "name");
ALTER TABLE "Supplier" ADD COLUMN "categoryId" UUID;
INSERT INTO "SupplierCategory" ("id", "name", "updatedAt")
SELECT gen_random_uuid(), source."supplierType", CURRENT_TIMESTAMP
FROM (SELECT DISTINCT trim("supplierType") AS "supplierType" FROM "Supplier" WHERE trim("supplierType") <> '') source;
UPDATE "Supplier" supplier SET "categoryId" = category."id" FROM "SupplierCategory" category WHERE category."name" = trim(supplier."supplierType");
ALTER TABLE "Supplier" ALTER COLUMN "categoryId" SET NOT NULL;
DROP INDEX "Supplier_supplierType_status_idx";
ALTER TABLE "Supplier" DROP COLUMN "supplierType";
CREATE INDEX "Supplier_categoryId_status_idx" ON "Supplier"("categoryId", "status");
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SupplierCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "SupplierRate" (
    "id" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "service" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "notes" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierRate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupplierRate_supplierId_startDate_endDate_idx" ON "SupplierRate"("supplierId", "startDate", "endDate");
CREATE INDEX "SupplierRate_currencyCode_idx" ON "SupplierRate"("currencyCode");
ALTER TABLE "SupplierRate" ADD CONSTRAINT "SupplierRate_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierRate" ADD CONSTRAINT "SupplierRate_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;