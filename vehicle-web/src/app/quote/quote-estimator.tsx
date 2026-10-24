"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Card } from "@/components/ui";
import { estimateQuote, type EstimateInput, type EstimateResult } from "@/lib/api";
import { describeMultiplier, formatUsd, perMonth } from "@/lib/format";

const CURRENT_YEAR = new Date().getFullYear();
const DURATIONS = [
  { days: 30, label: "1 month" },
  { days: 90, label: "3 months" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
];
const CONDITION_LABELS: Record<number, string> = {
  1: "Poor",
  3: "Rough",
  5: "Fair",
  7: "Good",
  9: "Excellent",
  10: "As new",
};

interface Form {
  year: string;
  marketValue: string;
  mileageKm: string;
  condition: number;
  accidents: number;
  usage: "private" | "commercial";
  coverage: string;
  deductible: string;
  durationDays: number;
}

const initial: Form = {
  year: "2020",
  marketValue: "15000",
  mileageKm: "60000",
  condition: 7,
  accidents: 0,
  usage: "private",
  coverage: "12000",
  deductible: "500",
  durationDays: 365,
};

const digits = (value: string) => value.replace(/[^\d]/g, "");

/// Turns the form into an API request, or explains what still needs filling in.
function toRequest(form: Form): { input: EstimateInput } | { missing: string } {
  const year = Number(form.year);
  if (!form.year || year < 1950 || year > CURRENT_YEAR + 1) return { missing: "Enter the model year" };
  if (!Number(form.marketValue)) return { missing: "Enter what the car is worth" };
  if (form.mileageKm === "") return { missing: "Enter the mileage" };
  if (!Number(form.coverage)) return { missing: "Choose how much cover you want" };
  if (form.deductible === "") return { missing: "Choose a deductible" };
  return {
    input: {
      vehicle: {
        year,
        marketValueUsdc: Number(form.marketValue),
        mileageKm: Number(form.mileageKm),
        condition: form.condition,
        accidentsLast3Years: form.accidents,
        usage: form.usage,
      },
      coverageUsdc: Number(form.coverage),
      deductibleUsdc: Number(form.deductible),
      durationDays: form.durationDays,
    },
  };
}

export function QuoteEstimator() {
  const [form, setForm] = useState<Form>(initial);
  const [result, setResult] = useState<EstimateResult | { kind: "missing"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));

  // Reprice shortly after the last change; a newer change cancels the request in flight.
  useEffect(() => {
    const request = toRequest(form);
    if ("missing" in request) {
      setResult({ kind: "missing", message: request.missing });
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      estimateQuote(request.input, controller.signal)
        .then((next) => {
          setResult(next);
          setLoading(false);
        })
        .catch(() => {}); // aborted by a newer change
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [form, attempt]);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
      <Card className="space-y-8">
        <fieldset className="space-y-5">
          <legend className="text-lg font-semibold">Your car</legend>
          <div className="grid gap-5 sm:grid-cols-3">
            <TextField label="Model year" value={form.year} onChange={(v) => set("year", digits(v).slice(0, 4))} />
            <TextField
              label="What it's worth"
              prefix="$"
              value={form.marketValue}
              onChange={(v) => set("marketValue", digits(v).slice(0, 7))}
            />
            <TextField
              label="Mileage"
              suffix="km"
              value={form.mileageKm}
              onChange={(v) => set("mileageKm", digits(v).slice(0, 7))}
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="condition" className="text-sm font-medium">
                Condition
              </label>
              <span className="text-sm text-ink-muted">
                {form.condition}/10 · {CONDITION_LABELS[form.condition] ?? CONDITION_LABELS[form.condition - 1] ?? ""}
              </span>
            </div>
            <input
              id="condition"
              type="range"
              min={1}
              max={10}
              value={form.condition}
              onChange={(e) => set("condition", Number(e.target.value))}
              className="mt-3 w-full accent-action"
            />
          </div>

          <Segmented
            label="Accidents in the last 3 years"
            options={[0, 1, 2, 3].map((n) => ({ value: n, label: n === 3 ? "3+" : String(n) }))}
            value={form.accidents}
            onChange={(v) => set("accidents", v)}
          />
          <Segmented
            label="How it's used"
            options={[
              { value: "private" as const, label: "Private" },
              { value: "commercial" as const, label: "Business / ride-hailing" },
            ]}
            value={form.usage}
            onChange={(v) => set("usage", v)}
          />
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="text-lg font-semibold">Your cover</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Cover amount"
              hint="The most we'd pay in total. Up to the car's value."
              prefix="$"
              value={form.coverage}
              onChange={(v) => set("coverage", digits(v).slice(0, 7))}
            />
            <TextField
              label="Deductible"
              hint="What you pay towards each claim. Higher means cheaper."
              prefix="$"
              value={form.deductible}
              onChange={(v) => set("deductible", digits(v).slice(0, 6))}
            />
          </div>
          <Segmented
            label="How long"
            options={DURATIONS.map((d) => ({ value: d.days, label: d.label }))}
            value={form.durationDays}
            onChange={(v) => set("durationDays", v)}
          />
        </fieldset>
      </Card>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <PriceCard result={result} loading={loading} durationDays={form.durationDays} onRetry={() => setAttempt((n) => n + 1)} />
      </div>
    </div>
  );
}

function PriceCard({
  result,
  loading,
  durationDays,
  onRetry,
}: {
  result: EstimateResult | { kind: "missing"; message: string } | null;
  loading: boolean;
  durationDays: number;
  onRetry: () => void;
}) {
  const term = DURATIONS.find((d) => d.days === durationDays)?.label.toLowerCase() ?? `${durationDays} days`;

  return (
    <Card className="space-y-5" >
      <div aria-live="polite" aria-busy={loading}>
        {!result || (loading && result.kind !== "priced") ? (
          <PriceSkeleton />
        ) : result.kind === "priced" ? (
          <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <p className="text-sm text-ink-muted">Your price for {term}</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums">{formatUsd(result.estimate.premiumUsdc)}</p>
            {durationDays === 365 && (
              <p className="mt-1 text-sm text-ink-muted">about {perMonth(result.estimate.premiumUsdc)} a month</p>
            )}
          </div>
        ) : result.kind === "declined" ? (
          <div>
            <p className="font-semibold text-warn">We can&apos;t cover this online yet</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted">
              {result.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : result.kind === "missing" ? (
          <p className="text-sm text-ink-muted">{result.message} to see your price.</p>
        ) : (
          <div>
            <p className="font-semibold text-danger">{result.message}</p>
            <button onClick={onRetry} className="mt-3 text-sm font-medium text-action hover:underline">
              Try again
            </button>
          </div>
        )}
      </div>

      {result?.kind === "priced" && (
        <div className="border-t border-line pt-5">
          <h2 className="text-sm font-semibold">What shaped your price</h2>
          <p className="mt-1 text-xs text-ink-faint">Starts at 4% of your cover a year, then:</p>
          <ul className="mt-3 space-y-2">
            {result.estimate.factors.map((factor) => (
              <li key={factor.name} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {factor.name}
                  <span className="block text-xs text-ink-faint">{factor.reason}</span>
                </span>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums ${
                    factor.multiplier > 1
                      ? "bg-warn/10 text-warn"
                      : factor.multiplier < 1
                        ? "bg-action/10 text-action"
                        : "bg-surface-2 text-ink-muted"
                  }`}
                >
                  {describeMultiplier(factor.multiplier)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="border-t border-line pt-5 text-xs text-ink-faint">
        This is an estimate. Your final price uses the details an assessor confirms from your car&apos;s photos.
      </p>
    </Card>
  );
}

function PriceSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-label="Working out your price">
      <div className="h-4 w-28 rounded bg-surface-2" />
      <div className="h-10 w-40 rounded bg-surface-2" />
      <div className="h-4 w-32 rounded bg-surface-2" />
    </div>
  );
}

function TextField({
  label,
  hint,
  prefix,
  suffix,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="mt-2 flex items-center rounded-xl border border-line bg-bg px-3 focus-within:border-action">
        {prefix && <span className="text-ink-faint">{prefix}</span>}
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="w-full bg-transparent px-2 py-3 tabular-nums outline-none"
        />
        {suffix && <span className="text-sm text-ink-faint">{suffix}</span>}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-faint">
          {hint}
        </p>
      )}
    </div>
  );
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label}>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-xl border px-4 text-sm font-medium transition-colors ${
              option.value === value
                ? "border-action bg-action/10 text-ink"
                : "border-line bg-bg text-ink-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
