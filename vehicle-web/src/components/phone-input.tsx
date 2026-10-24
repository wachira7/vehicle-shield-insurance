"use client";

import { useMemo, useState } from "react";
import { parsePhoneNumberFromString } from "libphonenumber-js/min";
import { browserCountry, countryOptions, flagOf, formatAsTyped, fromInternational, toInternational, type CountryCode } from "@/lib/phone";

/// A phone number from any country: pick the flag and dial code, type the local number.
/// `value` and `onChange` use international E.164 form ("+254712345678"); "" when empty.
export function PhoneInput({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const options = useMemo(() => countryOptions(), []);
  const [state, setState] = useState(() => fromInternational(value, browserCountry()));
  const [seen, setSeen] = useState(value);

  // A value set from outside (e.g. the saved profile arriving) replaces what's shown; our own
  // changes coming back through `value` match what's shown and leave it alone.
  if (value !== seen) {
    setSeen(value);
    if (value !== toInternational(state.national, state.country)) setState(fromInternational(value, state.country));
  }

  const emit = (national: string, country: CountryCode) => {
    setState({ country, national });
    onChange(toInternational(national, country));
  };

  const typed = (text: string) => {
    // A complete international number (typed or pasted with "+") picks its own country; until
    // it's complete it stays exactly as typed.
    if (text.trim().startsWith("+")) {
      const number = parsePhoneNumberFromString(text);
      return number?.isValid() && number.country ? emit(number.formatNational(), number.country) : emit(text, state.country);
    }
    // Format while typing, but not while deleting, so backspace never fights the spaces.
    emit(text.length > state.national.length ? formatAsTyped(text, state.country) : text, state.country);
  };

  const current = options.find((option) => option.code === state.country);

  return (
    <div
      className={`mt-2 flex items-stretch rounded-xl border bg-bg transition-colors focus-within:border-action has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-action/40 ${invalid ? "border-danger" : "border-line"}`}
    >
      <div className="relative flex shrink-0 items-center gap-1.5 border-r border-line pl-3 pr-2 text-sm">
        <span aria-hidden className="text-lg leading-none">
          {flagOf(state.country)}
        </span>
        <span aria-hidden className="tabular-nums text-ink-muted">
          +{current?.dial}
        </span>
        <svg aria-hidden viewBox="0 0 20 20" className="size-4 text-ink-faint" fill="currentColor">
          <path d="M5.5 7.5L10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
        <select
          aria-label="Country code"
          value={state.country}
          onChange={(event) => emit(state.national, event.target.value as CountryCode)}
          className="absolute inset-0 cursor-pointer opacity-0 focus-visible:outline-none"
        >
          {options.map((option) => (
            <option key={option.code} value={option.code}>
              {option.flag} {option.name} (+{option.dial})
            </option>
          ))}
        </select>
      </div>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={state.country === "KE" ? "0712 345 678" : "Phone number"}
        value={state.national}
        onChange={(event) => typed(event.target.value)}
        onBlur={onBlur}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className="min-w-0 flex-1 rounded-r-xl bg-transparent px-3 py-3 tabular-nums outline-none focus-visible:outline-none"
      />
    </div>
  );
}
