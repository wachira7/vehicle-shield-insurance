import { describe, expect, it } from "vitest";
import { countryOptions, defaultCountry, flagOf, formatAsTyped, formatPhone, fromInternational, phoneError, toInternational } from "./phone";

describe("phone numbers", () => {
  it("lists every country with its flag and dial code", () => {
    const options = countryOptions();
    expect(options.length).toBeGreaterThan(200);
    expect(options).toContainEqual({ code: "KE", name: "Kenya", dial: "254", flag: "🇰🇪" });
    expect(options.find((o) => o.code === "GB")?.dial).toBe("44");
    expect(flagOf("tz")).toBe("🇹🇿");
  });

  it("guesses the country from the timezone, then the browser language", () => {
    expect(defaultCountry("en-US", "Africa/Nairobi")).toBe("KE");
    expect(defaultCountry("en-US", "Africa/Kampala")).toBe("UG");
    expect(defaultCountry("en-KE")).toBe("KE");
    expect(defaultCountry("sw-TZ")).toBe("TZ");
    expect(defaultCountry("en-GB")).toBe("GB");
    expect(defaultCountry(undefined)).toBe("KE");
  });

  it("turns a local number into international form, with or without the leading 0", () => {
    expect(toInternational("0712 345 678", "KE")).toBe("+254712345678");
    expect(toInternational("712345678", "KE")).toBe("+254712345678");
    expect(toInternational("020 7946 0958", "GB")).toBe("+442079460958");
    expect(toInternational("", "KE")).toBe("");
  });

  it("keeps a half-typed international number as typed", () => {
    expect(toInternational("+2557541", "KE")).toBe("+2557541");
    expect(toInternational("+255 754 123 456", "KE")).toBe("+255754123456");
  });

  it("keeps an invalid number visible to validation", () => {
    const value = toInternational("12", "KE");
    expect(value).toBe("+25412");
    expect(phoneError(value)).toBeDefined();
    expect(phoneError("+254712345678")).toBeUndefined();
    expect(phoneError("")).toBeUndefined();
  });

  it("round-trips a stored number for editing and display", () => {
    expect(fromInternational("+254712345678", "GB")).toEqual({ country: "KE", national: "0712 345678" });
    expect(fromInternational("", "TZ")).toEqual({ country: "TZ", national: "" });
    expect(formatPhone("+254712345678")).toBe("+254 712 345678");
    expect(formatAsTyped("0712345", "KE")).toMatch(/^0712 345/);
  });
});
