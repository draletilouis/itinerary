import { Prisma } from "@prisma/client";
import type { TravellerRateBand } from "@/modules/packages/types";

export type TravellerMix = {
  ugandanAdults: number;
  ugandanChildren: number;
  eastAfricanAdults: number;
  eastAfricanChildren: number;
  nonEastAfricanAdults: number;
  nonEastAfricanChildren: number;
};

const countKeys = {
  "UGANDAN:ADULT": "ugandanAdults",
  "UGANDAN:CHILD": "ugandanChildren",
  "EAST_AFRICAN:ADULT": "eastAfricanAdults",
  "EAST_AFRICAN:CHILD": "eastAfricanChildren",
  "NON_EAST_AFRICAN:ADULT": "nonEastAfricanAdults",
  "NON_EAST_AFRICAN:CHILD": "nonEastAfricanChildren",
} as const satisfies Record<string, keyof TravellerMix>;

export function validateTravellerMix(mix: TravellerMix, adults: number, children: number) {
  for (const [key, value] of Object.entries(mix)) {
    if (!Number.isInteger(value) || value < 0) throw new Error(`${key} must be a non-negative whole number.`);
  }
  if (mix.ugandanAdults + mix.eastAfricanAdults + mix.nonEastAfricanAdults !== adults) {
    throw new Error("Traveller-category adult counts must equal the tour adult count.");
  }
  if (mix.ugandanChildren + mix.eastAfricanChildren + mix.nonEastAfricanChildren !== children) {
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
    if (mix[mixKey] > 0 && !supplied.has(bandKey)) throw new Error('A rate is required for ' + bandKey.toLowerCase().replaceAll('_', ' ').replace(':', ' ') + '.');
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
