import { describe, expect, it } from "vitest";
import { safeNext } from "./redirect";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/quote")).toBe("/quote");
    expect(safeNext("/account?tab=1")).toBe("/account?tab=1");
  });

  it("never sends you back to the sign-in or details pages", () => {
    expect(safeNext("/register")).toBe("/account");
    expect(safeNext("/register?next=/register")).toBe("/account");
    expect(safeNext("/signin?next=/quote")).toBe("/account");
    expect(safeNext("/registered-vehicles")).toBe("/registered-vehicles");
  });

  it("refuses other sites and falls back", () => {
    expect(safeNext("https://evil.example")).toBe("/account");
    expect(safeNext("//evil.example")).toBe("/account");
    expect(safeNext(null)).toBe("/account");
    expect(safeNext("", "/x")).toBe("/x");
  });
});
