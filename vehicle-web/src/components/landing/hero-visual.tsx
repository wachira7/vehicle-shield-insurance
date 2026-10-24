"use client";

import { useEffect, useState } from "react";

const CLAIM_STEPS = [
  { label: "Submitted", detail: "Photos uploaded" },
  { label: "Under review", detail: "Assessor checking" },
  { label: "Approved", detail: "$1,800 approved" },
  { label: "Paid", detail: "$1,300 sent to wallet" },
];

/// An example policy card with a claim moving through its steps, to show the product at a glance.
export function HeroVisual() {
  const [step, setStep] = useState(CLAIM_STEPS.length - 1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setStep(0);
    const timer = setInterval(() => setStep((s) => (s + 1) % (CLAIM_STEPS.length + 1)), 1600);
    return () => clearInterval(timer);
  }, []);

  const current = Math.min(step, CLAIM_STEPS.length - 1);

  return (
    <div className="relative mx-auto w-full max-w-sm" aria-label="Example policy and claim" role="img">
      <div className="animate-float rounded-3xl border border-line bg-surface/90 p-6 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-faint">Policy #1042</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-action/15 px-2.5 py-1 text-xs font-semibold text-action">
            <span className="size-1.5 rounded-full bg-action" />
            Active
          </span>
        </div>
        <p className="mt-4 text-lg font-semibold">Toyota Axio · 2019</p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-ink-faint">Cover</dt>
            <dd className="font-semibold tabular-nums">$12,000</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Deductible</dt>
            <dd className="font-semibold tabular-nums">$500</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Renews in</dt>
            <dd className="font-semibold tabular-nums">214 days</dd>
          </div>
        </dl>

        <div className="mt-6 rounded-2xl border border-line bg-bg/60 p-4">
          <p className="text-xs font-medium text-ink-muted">Claim #87 · rear bumper</p>
          <ol className="mt-3 space-y-2.5">
            {CLAIM_STEPS.map((s, index) => {
              const done = index <= current;
              return (
                <li key={s.label} className="flex items-center gap-3">
                  <span
                    className={`grid size-5 shrink-0 place-items-center rounded-full border text-[10px] transition-colors duration-500 ${
                      done ? "border-action bg-action text-action-ink" : "border-line text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className={`text-sm transition-colors duration-500 ${done ? "text-ink" : "text-ink-faint"}`}>
                    {s.label}
                  </span>
                  <span
                    className={`ml-auto text-xs tabular-nums transition-opacity duration-500 ${
                      index === current ? "text-action opacity-100" : "opacity-0"
                    }`}
                  >
                    {s.detail}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-ink-faint">Example policy</p>
    </div>
  );
}
