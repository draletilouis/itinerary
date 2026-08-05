CREATE TYPE "TravellerPricingCategory" AS ENUM ('UGANDAN', 'EAST_AFRICAN', 'NON_EAST_AFRICAN');
CREATE TYPE "TravellerAgeBand" AS ENUM ('ADULT', 'CHILD');

ALTER TABLE "Traveller" ADD COLUMN "pricingCategory" "TravellerPricingCategory";
ALTER TABLE "Tour"
  ADD COLUMN "ugandanAdults" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "ugandanChildren" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "eastAfricanAdults" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "eastAfricanChildren" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nonEastAfricanAdults" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nonEastAfricanChildren" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SupplierRate"
  ADD COLUMN "pricingCategory" "TravellerPricingCategory",
  ADD COLUMN "ageBand" "TravellerAgeBand";
ALTER TABLE "ActivityRate"
  ADD COLUMN "pricingCategory" "TravellerPricingCategory",
  ADD COLUMN "ageBand" "TravellerAgeBand";
ALTER TABLE "TourCostItem"
  ADD COLUMN "pricingCategory" "TravellerPricingCategory",
  ADD COLUMN "ageBand" "TravellerAgeBand";

CREATE INDEX "TourCostItem_pricingCategory_ageBand_idx" ON "TourCostItem"("pricingCategory", "ageBand");
