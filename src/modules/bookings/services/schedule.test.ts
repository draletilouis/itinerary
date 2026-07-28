import { describe, expect, it } from "vitest";
import { buildDepositSchedule, buildPaymentSchedule } from "./schedule";

describe("booking payment schedules", () => {
  it("builds deposit, instalment, and final balance milestones", () => {
    const result = buildDepositSchedule({
      totalAmount: "10000",
      depositAmount: "2000",
      depositDueDate: new Date("2026-08-01"),
      instalments: [
        {
          label: "Second instalment",
          amount: "3000",
          dueDate: new Date("2026-09-01"),
        },
      ],
      finalPaymentDate: new Date("2026-10-01"),
    });

    expect(result.map((entry) => entry.amount.toString())).toEqual([
      "2000",
      "3000",
      "5000",
    ]);
  });

  it("requires the schedule to match the accepted total", () => {
    expect(() =>
      buildPaymentSchedule("1000", [
        { label: "Deposit", amount: "400", dueDate: new Date("2026-08-01") },
      ]),
    ).toThrow("Payment schedule must equal the accepted booking total.");
  });

  it("rejects schedules with dates out of order", () => {
    expect(() =>
      buildPaymentSchedule("1000", [
        { label: "Deposit", amount: "400", dueDate: new Date("2026-09-01") },
        { label: "Balance", amount: "600", dueDate: new Date("2026-08-01") },
      ]),
    ).toThrow("Payment milestone dates must be in chronological order.");
  });
});
