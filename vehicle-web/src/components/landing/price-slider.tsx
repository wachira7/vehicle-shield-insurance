"use client";

import { useEffect, useState } from "react";
import { ButtonLink, Card } from "@/components/ui";
import { estimateQuote, type Estimate } from "@/lib/api";
import { formatUsd, perMonth } from "@/lib/format";

const MIN = 3_000;
const MAX = 60_000;
const STEP = 1_000;

/// Drag the car's value and see a live price for a typical car (5 years old, good condition,
/// no claims), insured for 80% of its value. The full quote page takes every detail.
export function PriceSlider() {
  const [value, setValue] = useState(15_000);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const coverage = Math.round((value * 0.8) / 100) * 100;
    const timer = setTimeout(() => {
      estimateQuote(
        {
          vehicle: {
            year: new Date().getFullYear() - 5,
            marketValueUsdc: value,
            mileageKm: 75_000,
            condition: 7,
            accidentsLast3Years: 0,
            usage: "private",
          },
          coverageUsdc: coverage,
          deductibleUsdc: Math.max(100, Math.round(coverage * 0.05)),
          durationDays: 365,
        },
        controller.signal,
      )
        .then((result) => {
          setFailed(result.kind !== "priced");
          if (result.kind === "priced") setEstimate(result.estimate);
        })
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  return (
    <Card className="grid gap-8 p-8 md:grid-cols-2 md:items-center">
      <div>
        <label htmlFor="car-value" className="text-sm font-medium text-ink-muted">
          Your car is worth
        </label>
        <p className="mt-1 text-4xl font-semibold tabular-nums">{formatUsd(value, { whole: true })}</p>
        <input
          id="car-value"
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="mt-6 w-full accent-action"
          aria-valuetext={formatUsd(value, { whole: true })}
        />
        <div className="mt-2 flex justify-between text-xs text-ink-faint">
          <span>{formatUsd(MIN, { whole: true })}</span>
          <span>{formatUsd(MAX, { whole: true })}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-bg/60 p-6" aria-live="polite">
        {failed && !estimate ? (
          <p className="text-sm text-ink-muted">Prices are unavailable right now. Try the full quote instead.</p>
        ) : (
          <>
            <p className="text-sm text-ink-muted">A typical policy would be about</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums text-action">
              {estimate ? perMonth(estimate.premiumUsdc) : "…"}
              <span className="text-base font-normal text-ink-muted"> /month</span>
            </p>
            <p className="mt-1 text-sm text-ink-faint">
              {estimate ? `${formatUsd(estimate.premiumUsdc)} a year` : "Working it out"} · 80% cover, 5-year-old car, no claims
            </p>
          </>
        )}
        <ButtonLink href="/quote" className="mt-5 w-full">
          Get your exact price
        </ButtonLink>
      </div>
    </Card>
  );
}
