ALTER TABLE "ItineraryItem"
ADD COLUMN "roomTypeId" UUID,
ADD COLUMN "guestsPerRoom" INTEGER;

ALTER TABLE "ItineraryItem"
ADD CONSTRAINT "ItineraryItem_roomTypeId_fkey"
FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ItineraryItem_roomTypeId_idx"
ON "ItineraryItem"("roomTypeId");

ALTER TABLE "ItineraryItem"
ADD CONSTRAINT "ItineraryItem_guestsPerRoom_check"
CHECK ("guestsPerRoom" IS NULL OR "guestsPerRoom" > 0);
