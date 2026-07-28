import { describe, expect, it } from "vitest";
import {
  assertQuotationTransition,
  isQuotationExpired,
  parseFutureValidityDate,
} from "./lifecycle";

describe("quotation lifecycle", () => {
  it("treats the validity date as inclusive", () => {
    const validUntil = new Date("2026-07-24T00:00:00.000Z");

    expect(isQuotationExpired(validUntil, new Date("2026-07-24T23:59:59.000Z"))).toBe(false);
    expect(isQuotationExpired(validUntil, new Date("2026-07-25T00:00:00.000Z"))).toBe(true);
  });

  it("allows only forward customer lifecycle transitions", () => {
    expect(() => assertQuotationTransition("GENERATED", "SENT")).not.toThrow();
    expect(() => assertQuotationTransition("SENT", "ACCEPTED")).not.toThrow();
    expect(() => assertQuotationTransition("DECLINED", "SENT")).toThrow(
      "Quotation cannot move from DECLINED to SENT.",
    );
    expect(() => assertQuotationTransition("ACCEPTED", "DECLINED")).toThrow(
      "Quotation cannot move from ACCEPTED to DECLINED.",
    );
  });

  it("rejects invalid or past validity dates", () => {
    const now = new Date("2026-07-24T12:00:00.000Z");

    expect(parseFutureValidityDate("2026-07-24", now).toISOString()).toBe(
      "2026-07-24T00:00:00.000Z",
    );
    expect(() => parseFutureValidityDate("2026-02-30", now)).toThrow(
      "Enter a valid quotation expiry date.",
    );
    expect(() => parseFutureValidityDate("2026-07-23", now)).toThrow(
      "Quotation expiry date cannot be in the past.",
    );
  });
});
