import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/app-shell.tsx"), "utf8");

describe("Kashtre-style application shell contract", () => {
  it("keeps every primary workflow reachable", () => {
    for (const href of [
      "/dashboard",
      "/enquiries",
      "/customers",
      "/tours",
      "/packages",
      "/itineraries",
      "/quotations",
      "/bookings",
      "/operations",
      "/suppliers",
      "/resources",
      "/finance",
      "/reports",
      "/settings",
    ]) {
      expect(source).toContain(`href: "${href}"`);
    }
  });

  it("preserves responsive and collapsible navigation controls", () => {
    expect(source).toContain('aria-label="Open navigation"');
    expect(source).toContain('aria-label="Close navigation"');
    expect(source).toContain('aria-expanded={expanded}');
    expect(source).toContain('hineni-sidebar-collapsed');
    expect(source).toContain('lg:w-20');
    expect(source).toContain('lg:w-64');
  });
});
