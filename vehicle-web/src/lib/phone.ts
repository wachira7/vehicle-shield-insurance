// Phone numbers from any country. The person picks a country (flag and dial code) and types
// the number as they'd say it locally; we store and send it in international E.164 form
// (e.g. +254712345678), which the API checks with the same rules.
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/min";

export type { CountryCode };

export interface CountryOption {
  code: CountryCode;
  name: string;
  dial: string;
  flag: string;
}

/// 🇰🇪 from "KE": two regional-indicator letters.
export const flagOf = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));

/// Every country with a dialling code, named in `locale` and sorted by name.
export function countryOptions(locale = "en"): CountryOption[] {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  return getCountries()
    .map((code) => ({ code, name: names.of(code) ?? code, dial: getCountryCallingCode(code), flag: flagOf(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

// The timezone says more than the language: many Kenyan browsers are set to "English (US)".
const TIMEZONE_COUNTRY: Record<string, CountryCode> = {
  "Africa/Nairobi": "KE",
  "Africa/Kampala": "UG",
  "Africa/Dar_es_Salaam": "TZ",
  "Africa/Kigali": "RW",
  "Africa/Addis_Ababa": "ET",
  "Africa/Mogadishu": "SO",
  "Africa/Juba": "SS",
  "Africa/Bujumbura": "BI",
  "Africa/Lagos": "NG",
  "Africa/Accra": "GH",
  "Africa/Johannesburg": "ZA",
  "Africa/Cairo": "EG",
  "Europe/London": "GB",
  "Asia/Dubai": "AE",
  "Asia/Kolkata": "IN",
};

/// The likely country from the browser's timezone (e.g. Africa/Nairobi), then its language
/// (e.g. "sw-TZ"); Kenya when it can't tell.
export function defaultCountry(language?: string, timeZone?: string): CountryCode {
  if (timeZone && TIMEZONE_COUNTRY[timeZone]) return TIMEZONE_COUNTRY[timeZone];
  try {
    const region = language ? new Intl.Locale(language).maximize().region : undefined;
    if (region && (getCountries() as string[]).includes(region)) return region as CountryCode;
  } catch {}
  return "KE";
}

/// defaultCountry for the current browser.
export function browserCountry(): CountryCode {
  if (typeof navigator === "undefined") return "KE";
  return defaultCountry(navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/// The local number as typed, formatted for its country as the person types ("712 345 678").
export const formatAsTyped = (national: string, country: CountryCode) => new AsYouType(country).input(national);

/// What to store for what was typed: E.164 when it's a real number, otherwise the digits with a
/// dial code so validation can explain what's wrong. A number typed with "+" keeps its own
/// code; a local one gets the selected country's. Empty stays empty.
export function toInternational(typed: string, country: CountryCode): string {
  const digits = typed.replace(/[^\d]/g, "");
  if (!digits) return "";
  const number = parsePhoneNumberFromString(typed, country);
  if (number?.isValid()) return number.number;
  return typed.trim().startsWith("+") ? `+${digits}` : `+${getCountryCallingCode(country)}${digits.replace(/^0+/, "")}`;
}

/// A stored international number back into its country and local form, for editing.
export function fromInternational(value: string, fallback: CountryCode): { country: CountryCode; national: string } {
  const number = value ? parsePhoneNumberFromString(value) : undefined;
  if (!number?.country) return { country: fallback, national: "" };
  return { country: number.country, national: number.formatNational() };
}

/// "+254 712 345 678" for display; the input unchanged if it can't be parsed.
export function formatPhone(value: string): string {
  return parsePhoneNumberFromString(value)?.formatInternational() ?? value;
}

export function phoneError(value: string): string | undefined {
  if (!value) return undefined;
  return isValidPhoneNumber(value) ? undefined : "That number doesn't look right for the selected country";
}
