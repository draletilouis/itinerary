import { describe, expect, it, vi } from "vitest";
import { initializeTourOperations } from "./initialize-operations";

function transaction(overrides: {
  existingTasks?: string[];
  existingConfirmations?: Array<{ supplierId: string; service: string; serviceDate: Date | null }>;
} = {}) {
  const operationalTaskCreateMany = vi.fn();
  const supplierConfirmationCreateMany = vi.fn();
  const tourUpdate = vi.fn();
  const tx = {
    tour: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: "tour-1",
        startDate: new Date("2026-08-10T00:00:00.000Z"),
        status: "CONFIRMED",
        booking: { acceptedItineraryVersionId: "version-1" },
        costItems: [{
          supplierId: "supplier-1",
          description: "Airport transfer",
          category: "Transport",
          itineraryDay: { dayNumber: 1 },
        }],
      }),
      update: tourUpdate,
    },
    operationalTask: {
      findMany: vi.fn().mockResolvedValue(
        (overrides.existingTasks ?? []).map((title) => ({ title })),
      ),
      updateMany: vi.fn(),
      createMany: operationalTaskCreateMany,
    },
    itineraryItem: {
      findMany: vi.fn().mockResolvedValue([{
        supplierId: "supplier-2",
        title: "Gorilla trekking",
        type: "ACTIVITY",
        day: { dayNumber: 2 },
      }]),
    },
    supplierConfirmation: {
      findMany: vi.fn().mockResolvedValue(overrides.existingConfirmations ?? []),
      createMany: supplierConfirmationCreateMany,
    },
  };
  return { tx, operationalTaskCreateMany, supplierConfirmationCreateMany, tourUpdate };
}

describe("automatic tour preparation", () => {
  it("creates checklist tasks and dated supplier confirmations", async () => {
    const fixture = transaction();
    const result = await initializeTourOperations(fixture.tx as never, {
      tourId: "tour-1",
      actorId: "user-1",
    });

    expect(result.tasksCreated).toBe(11);
    expect(result.supplierConfirmationsCreated).toBe(2);
    expect(fixture.supplierConfirmationCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          supplierId: "supplier-1",
          service: "Airport transfer",
          serviceDate: new Date("2026-08-10T00:00:00.000Z"),
        }),
        expect.objectContaining({
          supplierId: "supplier-2",
          service: "Gorilla trekking",
          serviceDate: new Date("2026-08-11T00:00:00.000Z"),
        }),
      ]),
    });
    expect(fixture.tourUpdate).toHaveBeenCalledWith({
      where: { id: "tour-1" },
      data: { status: "OPERATIONAL_PREPARATION" },
    });
  });

  it("does not duplicate existing tasks or confirmations", async () => {
    const fixture = transaction({
      existingTasks: ["Assign vehicle"],
      existingConfirmations: [{
        supplierId: "supplier-1",
        service: "Airport transfer",
        serviceDate: new Date("2026-08-10T00:00:00.000Z"),
      }],
    });
    const result = await initializeTourOperations(fixture.tx as never, {
      tourId: "tour-1",
      actorId: "user-1",
    });

    expect(result.tasksCreated).toBe(10);
    expect(result.supplierConfirmationsCreated).toBe(1);
    expect(fixture.supplierConfirmationCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ supplierId: "supplier-2" })],
    });
  });
});
