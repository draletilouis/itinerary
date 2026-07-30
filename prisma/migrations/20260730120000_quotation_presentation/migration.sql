CREATE TYPE "QuotationPresentationMode" AS ENUM ('ITEMIZED', 'PER_TRAVELLER', 'BOTH');

ALTER TABLE "QuotationVersion"
ADD COLUMN "presentationMode" "QuotationPresentationMode" NOT NULL DEFAULT 'BOTH',
ADD COLUMN "adultUnitPrice" DECIMAL(18,4),
ADD COLUMN "childUnitPrice" DECIMAL(18,4),
ADD COLUMN "travellerAdjustment" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- Legacy quotation lines represented a single pre-tax subtotal, so preserve them with an exact per-traveller view.
UPDATE "QuotationVersion" SET "presentationMode" = 'PER_TRAVELLER';