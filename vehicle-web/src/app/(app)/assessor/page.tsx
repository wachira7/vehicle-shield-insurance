"use client";

import Link from "next/link";
import { ClaimQueueRow, VehicleQueueRow, WaitBadge } from "@/components/queue-rows";
import { ButtonLink, Card } from "@/components/ui";
import { useMyDecisions, useOpenClaims, usePendingVehicles } from "@/lib/assessor-queries";
import { formatUsdcUnits } from "@/lib/format";
import { decisionStats, formatDuration } from "@/lib/queue";
import { useSession } from "@/lib/session";

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
};

export default function AssessorOverview() {
  const { profile } = useSession();
  const claims = useOpenClaims();
  const vehicles = usePendingVehicles();
  const history = useMyDecisions();
  const stats = decisionStats(history.data ?? []);
  const ready = (vehicles.data ?? []).filter((vehicle) => vehicle.missingViews.length === 0);
  const oldestClaim = claims.data?.[0];
  const oldestVehicle = ready[0];
  const waiting = (claims.data?.length ?? 0) + ready.length;

  // The single most urgent item: the oldest claim (money is at stake), else the oldest car.
  const next = oldestClaim
    ? { title: `Claim #${oldestClaim.id} · ${formatUsdcUnits(oldestClaim.requestedAmount, { whole: true })}`, since: Number(oldestClaim.submittedAt) * 1000, href: `/assessor/claims/${oldestClaim.id}` }
    : oldestVehicle
      ? { title: `${oldestVehicle.plate} · ${oldestVehicle.make} ${oldestVehicle.model}`, since: new Date(oldestVehicle.createdAt).getTime(), href: `/assessor/vehicles/${oldestVehicle.id}` }
      : null;

  return (
    <div className="space-y-8">
      <header className="animate-step-in">
        <h1 className="text-3xl font-semibold tracking-tight">
          {greeting()}
          {profile?.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-ink-muted">
          {claims.isPending || vehicles.isPending
            ? "Checking the queues…"
            : waiting
              ? `${waiting} item${waiting > 1 ? "s" : ""} waiting for a decision.`
              : "Nothing waiting. New claims and cars appear here within seconds."}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Claims waiting" value={claims.data?.length} hint={oldestClaim ? <WaitBadge since={Number(oldestClaim.submittedAt) * 1000} /> : "None"} href="/assessor/claims" />
        <Tile label="Cars to verify" value={vehicles.data ? ready.length : undefined} hint={oldestVehicle ? <WaitBadge since={new Date(oldestVehicle.createdAt).getTime()} /> : "None"} href="/assessor/vehicles" />
        <Tile label="You decided today" value={history.data ? stats.today : undefined} hint={history.data ? `${stats.last30Days} in 30 days` : undefined} href="/assessor/history" />
        <Tile
          label="Your time to decide"
          value={history.data ? (stats.averageMs === null ? "—" : formatDuration(stats.averageMs)) : undefined}
          hint="Average, last 30 days"
          href="/assessor/history"
        />
      </dl>

      {next && (
        <div className="animate-step-in flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-action/30 bg-gradient-to-br from-action/10 via-surface to-surface p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-action">Next up</p>
            <p className="mt-2 text-xl font-semibold">{next.title}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
              Waiting the longest <WaitBadge since={next.since} />
            </p>
          </div>
          <ButtonLink href={next.href}>Review</ButtonLink>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Claims to decide" href="/assessor/claims" loading={claims.isPending} error={claims.isError} empty="No open claims.">
          {claims.data?.slice(0, 3).map((claim) => (
            <li key={claim.id} className="animate-step-in">
              <ClaimQueueRow claim={claim} />
            </li>
          ))}
        </Section>
        <Section title="Cars to verify" href="/assessor/vehicles" loading={vehicles.isPending} error={vehicles.isError} empty="No cars ready to verify.">
          {ready.slice(0, 3).map((vehicle) => (
            <li key={vehicle.id} className="animate-step-in">
              <VehicleQueueRow vehicle={vehicle} />
            </li>
          ))}
        </Section>
      </div>
    </div>
  );
}

function Tile({ label, value, hint, href }: { label: string; value?: number | string; hint?: React.ReactNode; href: string }) {
  return (
    <Link href={href} className="block">
      <Card className="h-full p-5 transition-colors hover:bg-surface-2">
        <dt className="text-sm text-ink-muted">{label}</dt>
        <dd className="mt-2 text-3xl font-semibold tabular-nums">{value ?? <span className="inline-block h-8 w-12 animate-pulse rounded-lg bg-surface-2 align-middle" />}</dd>
        <dd className="mt-2 text-xs text-ink-faint">{hint}</dd>
      </Card>
    </Link>
  );
}

function Section({
  title,
  href,
  loading,
  error,
  empty,
  children,
}: {
  title: string;
  href: string;
  loading: boolean;
  error: boolean;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <Link href={href} className="text-sm text-ink-muted hover:text-ink">
          See all
        </Link>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : error ? (
        <Card className="text-sm text-ink-muted">This queue couldn&apos;t be loaded. It retries on its own.</Card>
      ) : items.length ? (
        <ul className="space-y-3">{children}</ul>
      ) : (
        <Card className="py-10 text-center text-sm text-ink-muted">{empty}</Card>
      )}
    </section>
  );
}
