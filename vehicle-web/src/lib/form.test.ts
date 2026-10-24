import { describe, expect, it } from "vitest";
import { visibleError } from "./form";

describe("visibleError", () => {
  const errors = { email: "Enter your email", name: undefined };
  it("stays quiet until the field is left or the form submitted", () => {
    expect(visibleError(errors, "email", new Set(), false)).toBeUndefined();
    expect(visibleError(errors, "email", new Set(["email"]), false)).toBe("Enter your email");
    expect(visibleError(errors, "email", new Set(), true)).toBe("Enter your email");
  });
  it("shows nothing for a valid field", () => {
    expect(visibleError(errors, "name", new Set(["name"]), true)).toBeUndefined();
  });
});
