export type PackageItineraryItemTemplate = {
  type: "ACTIVITY" | "ACCOMMODATION" | "TRANSPORT" | "MEAL" | "NOTE" | "OTHER";
  startTime?: string;
  endTime?: string;
  title: string;
  clientDescription?: string;
  activityId?: string;
  accommodationId?: string;
  roomTypeId?: string;
  guestsPerRoom?: number;
  supplierId?: string;
};

export type PackageDayTemplate = {
  dayNumber: number;
  title: string;
  destinationId?: string;
  startLocation?: string;
  endLocation?: string;
  clientNarrative?: string;
  meals: string[];
  transport?: string;
  items: PackageItineraryItemTemplate[];
};

export type PackageCostTemplate = {
  category: string;
  description: string;
  basis: "STANDARD" | "ACCOMMODATION" | "PER_PERSON" | "PER_PERSON_PER_NIGHT" | "PER_PERSON_PER_DAY" | "VEHICLE" | "OVERRIDE";
  unitCost: string;
  quantity: string;
  days: string;
  nights: string;
  rooms: string;
  vehicles: string;
  eligibleTravellers: string;
  taxPercentage: string;
  commissionPercentage: string;
  overrideTotal?: string;
  overrideReason?: string;
  originalCurrencyCode: string;
  supplierId?: string;
  dayNumber?: number;
  classification: "INCLUDED" | "OPTIONAL" | "EXCLUDED";
  optionCode?: string;
  inclusionText?: string;
  supplierRateId?: string;
};
