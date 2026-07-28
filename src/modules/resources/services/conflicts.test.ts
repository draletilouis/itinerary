import { describe, expect, it } from "vitest";
import {
  rangesOverlap,
  resourceForeignKey,
  validateResourceRange,
} from "./conflicts";

describe("resource scheduling invariants", () => {
  const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

  it("treats touching inclusive tour dates as an overlap", () => {
    expect(
      rangesOverlap(
        { startDate: date("2026-08-01"), endDate: date("2026-08-05") },
        { startDate: date("2026-08-05"), endDate: date("2026-08-09") },
      ),
    ).toBe(true);
  });

  it("allows separated resource ranges", () => {
    expect(
      rangesOverlap(
        { startDate: date("2026-08-01"), endDate: date("2026-08-05") },
        { startDate: date("2026-08-06"), endDate: date("2026-08-09") },
      ),
    ).toBe(false);
  });

  it("rejects reversed resource dates", () => {
    expect(() =>
      validateResourceRange({
        startDate: date("2026-08-10"),
        endDate: date("2026-08-01"),
      }),
    ).toThrow("end date");
  });

  it("maps each resource type to exactly one foreign key", () => {
    expect(resourceForeignKey("VEHICLE", "id")).toEqual({ vehicleId: "id" });
    expect(resourceForeignKey("DRIVER", "id")).toEqual({ driverId: "id" });
    expect(resourceForeignKey("GUIDE", "id")).toEqual({ guideId: "id" });
    expect(resourceForeignKey("EQUIPMENT", "id")).toEqual({ equipmentId: "id" });
  });
});
