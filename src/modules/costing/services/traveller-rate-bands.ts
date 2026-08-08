import { Prisma } from "@prisma/client";
import { travellerRateBandLabel, travellerMixFieldNames, type TravellerAgeBand, type TravellerPricingCategory } from "@/modules/costing/traveller-categories";
import type { TravellerRateBand } from "@/modules/packages/types";

export type TravellerMix = {
  ugandanAdults: number;
  ugandanChildren: number;
  foreignersAdults: number;
  foreignersChildren: number;
  residentForeignersAdults: number;
  residentForeignersChildren: number;
  eastAfricanAdults: number;
  eastAfricanChildren: number;
};

const countKeys = {
  "UGANDANS:ADULT": travellerMixFieldNames.UGANDANS.adults,
  "UGANDANS:CHILD": travellerMixFieldNames.UGANDANS.children,
  "FOREIGNERS:ADULT": travellerMixFieldNames.FOREIGNERS.adults,
  "FOREIGNERS:CHILD": travellerMixFieldNames.FOREIGNERS.children,
  "RESIDENT_FOREIGNERS:ADULT": travellerMixFieldNames.RESIDENT_FOREIGNERS.adults,
  "RESIDENT_FOREIGNERS:CHILD": travellerMixFieldNames.RESIDENT_FOREIGNERS.children,
  "EAST_AFRICANS:ADULT": travellerMixFieldNames.EAST_AFRICANS.adults,
  "EAST_AFRICANS:CHILD": travellerMixFieldNames.EAST_AFRICANS.children,
} as const satisfies Record<string, keyof TravellerMix>;

export function validateTravellerMix(mix: TravellerMix, adults: number, children: number) {
  for (const [key, value] of Object.entries(mix)) {
    if (!Number.isInteger(value) || value < 0) throw new Error(`${key} must be a non-negative whole number.`);
  }
  if (mix.ugandanAdults + mix.foreignersAdults + mix.residentForeignersAdults + mix.eastAfricanAdults !== adults) {
    throw new Error("Traveller-category adult counts must equal the tour adult count.");
  }
  if (mix.ugandanChildren + mix.foreignersChildren + mix.residentForeignersChildren + mix.eastAfricanChildren !== children) {
    throw new Error("Traveller-category child counts must equal the tour child count.");
  }
  return mix;
}

export function countForRateBand(mix: TravellerMix, band: Pick<TravellerRateBand, "pricingCategory" | "ageBand">) {
  return mix[countKeys[`${band.pricingCategory}:${band.ageBand}`]];
}

export function calculateRateBandTotals(bands: TravellerRateBand[], mix: TravellerMix) {
  const supplied = new Set(bands.map((band) => band.pricingCategory + ':' + band.ageBand));
  for (const [bandKey, mixKey] of Object.entries(countKeys)) {
    if (mix[mixKey] > 0 && !supplied.has(bandKey)) {
      const [category, ageBand] = bandKey.split(":") as [TravellerPricingCategory, TravellerAgeBand];
      throw new Error(`A rate is required for ${travellerRateBandLabel(category, ageBand).toLowerCase()}.`);
    }
  }
  return bands.map((band) => {
    const travellerCount = countForRateBand(mix, band);
    return {
      ...band,
      travellerCount,
      subtotal: new Prisma.Decimal(band.unitCost).mul(travellerCount),
    };
  }).filter((band) => band.travellerCount > 0);
}
