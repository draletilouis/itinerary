export const travellerPricingCategories = [
  "UGANDANS",
  "FOREIGNERS",
  "RESIDENT_FOREIGNERS",
  "EAST_AFRICANS",
] as const;

export type TravellerPricingCategory = typeof travellerPricingCategories[number];

export const travellerAgeBands = ["ADULT", "CHILD"] as const;

export type TravellerAgeBand = typeof travellerAgeBands[number];

export const travellerPricingCategoryLabels = {
  UGANDANS: "Ugandans",
  FOREIGNERS: "Foreigners",
  RESIDENT_FOREIGNERS: "Resident foreigners",
  EAST_AFRICANS: "East Africans",
} as const satisfies Record<TravellerPricingCategory, string>;

export const travellerMixFieldEntries = [
  { pricingCategory: "UGANDANS", ageBand: "ADULT", fieldName: "ugandanAdults", label: "Ugandans adults" },
  { pricingCategory: "UGANDANS", ageBand: "CHILD", fieldName: "ugandanChildren", label: "Ugandans children" },
  { pricingCategory: "FOREIGNERS", ageBand: "ADULT", fieldName: "foreignersAdults", label: "Foreigners adults" },
  { pricingCategory: "FOREIGNERS", ageBand: "CHILD", fieldName: "foreignersChildren", label: "Foreigners children" },
  { pricingCategory: "RESIDENT_FOREIGNERS", ageBand: "ADULT", fieldName: "residentForeignersAdults", label: "Resident foreigners adults" },
  { pricingCategory: "RESIDENT_FOREIGNERS", ageBand: "CHILD", fieldName: "residentForeignersChildren", label: "Resident foreigners children" },
  { pricingCategory: "EAST_AFRICANS", ageBand: "ADULT", fieldName: "eastAfricanAdults", label: "East Africans adults" },
  { pricingCategory: "EAST_AFRICANS", ageBand: "CHILD", fieldName: "eastAfricanChildren", label: "East Africans children" },
] as const;

export const travellerMixFieldNames = {
  UGANDANS: { adults: "ugandanAdults", children: "ugandanChildren" },
  FOREIGNERS: { adults: "foreignersAdults", children: "foreignersChildren" },
  RESIDENT_FOREIGNERS: { adults: "residentForeignersAdults", children: "residentForeignersChildren" },
  EAST_AFRICANS: { adults: "eastAfricanAdults", children: "eastAfricanChildren" },
} as const satisfies Record<TravellerPricingCategory, { adults: string; children: string }>;

export const travellerRateBandEntries = [
  {
    pricingCategory: "UGANDANS",
    ageBand: "ADULT",
    rateFieldName: "rate_UGANDANS_ADULT",
    currencyFieldName: "currency_UGANDANS_ADULT",
    label: "Ugandans adult",
  },
  {
    pricingCategory: "UGANDANS",
    ageBand: "CHILD",
    rateFieldName: "rate_UGANDANS_CHILD",
    currencyFieldName: "currency_UGANDANS_CHILD",
    label: "Ugandans child",
  },
  {
    pricingCategory: "FOREIGNERS",
    ageBand: "ADULT",
    rateFieldName: "rate_FOREIGNERS_ADULT",
    currencyFieldName: "currency_FOREIGNERS_ADULT",
    label: "Foreigners adult",
  },
  {
    pricingCategory: "FOREIGNERS",
    ageBand: "CHILD",
    rateFieldName: "rate_FOREIGNERS_CHILD",
    currencyFieldName: "currency_FOREIGNERS_CHILD",
    label: "Foreigners child",
  },
  {
    pricingCategory: "RESIDENT_FOREIGNERS",
    ageBand: "ADULT",
    rateFieldName: "rate_RESIDENT_FOREIGNERS_ADULT",
    currencyFieldName: "currency_RESIDENT_FOREIGNERS_ADULT",
    label: "Resident foreigners adult",
  },
  {
    pricingCategory: "RESIDENT_FOREIGNERS",
    ageBand: "CHILD",
    rateFieldName: "rate_RESIDENT_FOREIGNERS_CHILD",
    currencyFieldName: "currency_RESIDENT_FOREIGNERS_CHILD",
    label: "Resident foreigners child",
  },
  {
    pricingCategory: "EAST_AFRICANS",
    ageBand: "ADULT",
    rateFieldName: "rate_EAST_AFRICANS_ADULT",
    currencyFieldName: "currency_EAST_AFRICANS_ADULT",
    label: "East Africans adult",
  },
  {
    pricingCategory: "EAST_AFRICANS",
    ageBand: "CHILD",
    rateFieldName: "rate_EAST_AFRICANS_CHILD",
    currencyFieldName: "currency_EAST_AFRICANS_CHILD",
    label: "East Africans child",
  },
] as const;

export function travellerRateBandKey(pricingCategory: TravellerPricingCategory, ageBand: TravellerAgeBand) {
  return `${pricingCategory}:${ageBand}` as const;
}

export function travellerRateBandLabel(pricingCategory: TravellerPricingCategory, ageBand: TravellerAgeBand) {
  return `${travellerPricingCategoryLabels[pricingCategory]} ${ageBand.toLowerCase()}`;
}

