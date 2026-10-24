import { describe, expect, it } from "vitest";
import { safeNext } from "./redirect";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/quote")).toBe("/quote");
    expect(safeNext("/account?tab=1")).toBe("/account?tab=1");
  });

  it("never sends you back to the sign-in or details pages", () => {
    expect(safeNext("/register")).toBe("/dashboard");
    expect(safeNext("/register?next=/register")).toBe("/dashboard");
    expect(safeNext("/signin?next=/quote")).toBe("/dashboard");
    expect(safeNext("/registered-vehicles")).toBe("/registered-vehicles");
  });

  it("refuses other sites and falls back", () => {
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext("", "/x")).toBe("/x");
  });
});
