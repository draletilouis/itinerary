import { describe, expect, it } from "vitest";
import { roomsRequired } from "./rooms";

describe("roomsRequired", () => {
  it("rounds up when guests do not divide evenly", () => {
    expect(roomsRequired(4, 3)).toBe(2);
    expect(roomsRequired(5, 2)).toBe(3);
  });

  it("uses exact capacity when guests divide evenly", () => {
    expect(roomsRequired(4, 2)).toBe(2);
    expect(roomsRequired(4, 4)).toBe(1);
  });

  it("rejects invalid guest and occupancy counts", () => {
    expect(() => roomsRequired(0, 2)).toThrow();
    expect(() => roomsRequired(4, 0)).toThrow();
  });
});
