import { describe, expect, it } from "vitest";
import { calculateOperationalReadiness } from "./readiness";

const start = new Date("2026-08-01T00:00:00.000Z");
const end = new Date("2026-08-10T00:00:00.000Z");

function readyInput() {
  return {
    bookingStatus: "CONFIRMED" as const,
    acceptedItineraryVersionId: "version",
    travellerCount: 2,
    tourStartDate: start,
    tourEndDate: end,
    assignments: (["VEHICLE", "DRIVER", "GUIDE"] as const).map(
      (resourceType) => ({
        resourceType,
        status: "CONFIRMED" as const,
        startDate: start,
        endDate: end,
      }),
    ),
    tasks: [{ mandatory: true, status: "COMPLETED" as const }],
    confirmations: [{ status: "CONFIRMED" as const }],
    incidents: [],
  };
}

describe("operational readiness", () => {
  it("marks a fully controlled tour ready", () => {
    const result = calculateOperationalReadiness(readyInput());
    expect(result.ready).toBe(true);
    expect(result.score).toBe(100);
    expect(result.blockers).toEqual([]);
  });

  it("requires assignments to cover the complete tour", () => {
    const input = readyInput();
    input.assignments[0].startDate = new Date("2026-08-02T00:00:00.000Z");
    const result = calculateOperationalReadiness(input);
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("Vehicle confirmed for full tour");
  });

  it("blocks readiness for unpaid bookings and serious incidents", () => {
    const result = calculateOperationalReadiness({
      ...readyInput(),
      bookingStatus: "AWAITING_DEPOSIT",
      incidents: [
        {
          severity: "CRITICAL",
          status: "INVESTIGATING",
        },
      ],
    });
    expect(result.blockers).toContain("Booking financially confirmed");
    expect(result.blockers).toContain("No serious open incident");
  });

  it("accepts an explicitly waived mandatory task", () => {
    const result = calculateOperationalReadiness({
      ...readyInput(),
      tasks: [{ mandatory: true, status: "WAIVED" }],
    });
    expect(result.ready).toBe(true);
  });
});
