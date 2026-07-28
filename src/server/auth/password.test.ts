import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password security", () => {
  it("hashes and verifies a valid password", async () => {
    const hash = await hashPassword("a-secure-password-2026");
    expect(hash).not.toContain("a-secure-password-2026");
    await expect(verifyPassword("a-secure-password-2026", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("a-secure-password-2026");
    await expect(verifyPassword("incorrect-password", hash)).resolves.toBe(false);
  });

  it("requires at least 12 characters", async () => {
    await expect(hashPassword("too-short")).rejects.toThrow("12 characters");
  });
});
