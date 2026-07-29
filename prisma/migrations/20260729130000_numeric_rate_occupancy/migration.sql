ALTER TABLE "AccommodationRate"
ADD COLUMN "occupancyGuests" INTEGER;

UPDATE "AccommodationRate" AS rate
SET "occupancyGuests" = room."maximumOccupancy"
FROM "RoomType" AS room
WHERE room."id" = rate."roomTypeId";

ALTER TABLE "AccommodationRate"
ALTER COLUMN "occupancyGuests" SET NOT NULL;

ALTER TABLE "AccommodationRate"
ADD CONSTRAINT "AccommodationRate_occupancyGuests_check"
CHECK ("occupancyGuests" > 0);
