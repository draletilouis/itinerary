import { estimatePackageCost } from "./presentation";
import type { PackageCostTemplate, PackageDayTemplate } from "./types";

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const related = (left: string, right: string) => {
  const a = normalize(left); const b = normalize(right);
  return a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a));
};

export function reconcilePackage(days: PackageDayTemplate[], costs: PackageCostTemplate[]) {
  const issues: { level: "error" | "warning"; message: string }[] = [];
  for (const day of days) {
    for (const item of day.items.filter((entry) => !["NOTE", "MEAL"].includes(entry.type))) {
      const matched = costs.some((cost) =>
        cost.classification !== "EXCLUDED" &&
        (!cost.dayNumber || cost.dayNumber === day.dayNumber) &&
        related(cost.description, item.title),
      );
      if (!matched) issues.push({ level: "warning", message: `Day ${day.dayNumber}: “${item.title}” has no matching cost.` });
    }
  }
  for (const cost of costs) {
    if (cost.classification === "OPTIONAL" && !cost.optionCode) issues.push({ level: "error", message: `Optional cost “${cost.description}” needs an option group.` });
    if (cost.classification === "INCLUDED" && !cost.inclusionText) issues.push({ level: "warning", message: `Included cost “${cost.description}” needs customer-facing inclusion wording.` });
    if (cost.dayNumber) {
      const day = days.find((entry) => entry.dayNumber === cost.dayNumber);
      if (!day?.items.some((item) => related(item.title, cost.description))) issues.push({ level: "warning", message: `Cost “${cost.description}” is linked to Day ${cost.dayNumber} but has no matching itinerary item.` });
    }
  }
  return issues;
}

export function summarizePackageCosts(costs: PackageCostTemplate[]) {
  const totals = new Map<string, { included: number; optional: number }>();
  for (const cost of costs) {
    if (cost.classification === "EXCLUDED") continue;
    const current = totals.get(cost.originalCurrencyCode) ?? { included: 0, optional: 0 };
    const amount = estimatePackageCost(cost).total;
    if (cost.classification === "OPTIONAL") current.optional += amount;
    else current.included += amount;
    totals.set(cost.originalCurrencyCode, current);
  }
  return Array.from(totals, ([currencyCode, values]) => ({ currencyCode, ...values, withOptions: values.included + values.optional }));
}
