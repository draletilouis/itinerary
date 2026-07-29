ALTER TABLE "TourCostItem"
ADD COLUMN "sourceItineraryItemId" UUID;

CREATE UNIQUE INDEX "TourCostItem_sourceItineraryItemId_key"
ON "TourCostItem"("sourceItineraryItemId");

ALTER TABLE "TourCostItem"
ADD CONSTRAINT "TourCostItem_sourceItineraryItemId_fkey"
FOREIGN KEY ("sourceItineraryItemId") REFERENCES "ItineraryItem"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
