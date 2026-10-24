import type { Metadata } from "next";
import { QuoteEstimator } from "./quote-estimator";

export const metadata: Metadata = {
  title: "Get a quote",
  description: "See your car insurance price in seconds and exactly how it was worked out. No sign-up or wallet needed.",
};

export default function QuotePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Get a quote</h1>
      <p className="mt-2 text-ink-muted">No sign-up or wallet needed. The price updates as you go.</p>
      <QuoteEstimator />
    </div>
  );
}
