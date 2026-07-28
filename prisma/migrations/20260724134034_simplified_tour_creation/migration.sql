-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "sourcePackageId" UUID,
ADD COLUMN     "sourcePackageRevision" INTEGER;

-- CreateTable
CREATE TABLE "TourPackage" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TourType" NOT NULL DEFAULT 'STANDARD_PACKAGE',
    "durationDays" INTEGER NOT NULL,
    "defaultAdults" INTEGER NOT NULL DEFAULT 2,
    "defaultChildren" INTEGER NOT NULL DEFAULT 0,
    "costingCurrencyCode" CHAR(3) NOT NULL,
    "quotationCurrencyCode" CHAR(3) NOT NULL,
    "introduction" TEXT,
    "summary" TEXT,
    "inclusions" TEXT[],
    "exclusions" TEXT[],
    "importantNotes" TEXT,
    "terms" TEXT,
    "itineraryTemplate" JSONB NOT NULL,
    "costTemplate" JSONB NOT NULL,
    "defaultContingencyMethod" TEXT NOT NULL DEFAULT 'NONE',
    "defaultContingencyValue" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "defaultMarkupMethod" "PricingMarkupMethod" NOT NULL DEFAULT 'PERCENTAGE',
    "defaultMarkupValue" DECIMAL(18,4) NOT NULL DEFAULT 20,
    "defaultTaxMethod" TEXT NOT NULL DEFAULT 'NONE',
    "defaultTaxValue" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "defaultDiscountMethod" TEXT NOT NULL DEFAULT 'NONE',
    "defaultDiscountValue" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "minimumMargin" DECIMAL(9,4),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "TourPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TourPackage_reference_key" ON "TourPackage"("reference");

-- CreateIndex
CREATE INDEX "TourPackage_status_name_idx" ON "TourPackage"("status", "name");

-- CreateIndex
CREATE INDEX "TourPackage_createdById_idx" ON "TourPackage"("createdById");

-- CreateIndex
CREATE INDEX "Tour_sourcePackageId_idx" ON "Tour"("sourcePackageId");

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_sourcePackageId_fkey" FOREIGN KEY ("sourcePackageId") REFERENCES "TourPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourPackage" ADD CONSTRAINT "TourPackage_costingCurrencyCode_fkey" FOREIGN KEY ("costingCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourPackage" ADD CONSTRAINT "TourPackage_quotationCurrencyCode_fkey" FOREIGN KEY ("quotationCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourPackage" ADD CONSTRAINT "TourPackage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
