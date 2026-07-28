import { describe, expect, it } from "vitest";
import {
  bookingPaymentState,
  calculateFinancialBalance,
  convertFinancialAmount,
  invoiceStatusForBalance,
} from "./calculations";

describe("finance calculations", () => {
  it("converts a payment using its preserved exchange rate", () => {
    expect(convertFinancialAmount("500", "3850").toString()).toBe("1925000");
  });

  it("calculates net paid and balance after a refund", () => {
    const result = calculateFinancialBalance("10000", "6000", "1000");
    expect(result.netPaid.toString()).toBe("5000");
    expect(result.balanceDue.toString()).toBe("5000");
  });

  it("rejects refunds above recorded payments", () => {
    expect(() => calculateFinancialBalance("10000", "1000", "1001")).toThrow(
      "Refunds cannot exceed recorded payments.",
    );
  });

  it("derives invoice and booking payment states", () => {
    expect(invoiceStatusForBalance("10000", "2500")).toBe("PARTIALLY_PAID");
    expect(bookingPaymentState("10000", "10000")).toEqual({
      paymentStatus: "PAID",
      bookingStatus: "FULLY_PAID",
    });
  });
});
