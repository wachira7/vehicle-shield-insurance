"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui";
import { useMyDecisions, type HistoryItem } from "@/lib/assessor-queries";
import { explorerTx } from "@/lib/contracts";
import { formatDuration } from "@/lib/queue";

const outcomeLabels: Record<HistoryItem["outcome"], string> = {
  approved: "Approved",
  verified: "Verified",
  declined: "Declined",
  "sent back": "Sent back",
};

/// How long the item waited for this decision.
const waited = (ms: number) => (ms < 5 * 60_000 ? "within minutes" : `after ${formatDuration(ms)}`);

const outcomeStyles: Record<HistoryItem["outcome"], string> = {
  approved: "bg-action/15 text-action",
  verified: "bg-action/15 text-action",
  declined: "bg-danger/10 text-danger",
  "sent back": "bg-warn/10 text-warn",
};

export default function History() {
  const history = useMyDecisions();
  const [filter, setFilter] = useState<"all" | "claim" | "vehicle">("all");
  const items = (history.data ?? []).filter((item) => filter === "all" || item.kind === filter);

  return (
    <div className="space-y-6">
      <header className="animate-step-in flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">History</h1>
          <p className="mt-1 text-ink-muted">Your decisions, newest first. Claim decisions link to their on-chain record.</p>
        </div>
        <div className="flex rounded-xl border border-line p-1 text-sm" role="tablist" aria-label="Show">
          {(["all", "claim", "vehicle"] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${filter === value ? "bg-surface-2 text-ink" : "text-ink-muted hover:text-ink"}`}
            >
              {value === "all" ? "All" : value === "claim" ? "Claims" : "Vehicles"}
            </button>
          ))}
        </div>
      </header>

      {history.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : history.isError ? (
        <Card className="text-sm text-ink-muted">Your history couldn&apos;t be loaded. It retries on its own.</Card>
      ) : items.length ? (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="animate-step-in flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${outcomeStyles[item.outcome]}`}>{outcomeLabels[item.outcome]}</span>
                    <Link href={item.href} className="font-medium hover:text-action">
                      {item.title}
                    </Link>
                  </div>
                  {item.detail && <p className="mt-1 truncate text-sm text-ink-muted">{item.detail}</p>}
                </div>
                <div className="text-right text-xs text-ink-faint">
                  <p>{new Date(item.decidedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  <p>
                    {waited(item.decidedAt - item.arrivedAt)}
                    {item.txHash && (
                      <>
                        {" · "}
                        <a href={explorerTx(item.txHash)} target="_blank" rel="noreferrer" className="underline">
                          on-chain
                        </a>
                      </>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="py-14 text-center">
          <p className="text-lg font-semibold">No decisions yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">Claims you approve or decline and cars you verify will be listed here.</p>
        </Card>
      )}
    </div>
  );
}
