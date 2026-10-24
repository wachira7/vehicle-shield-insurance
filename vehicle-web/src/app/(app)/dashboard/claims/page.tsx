import { ButtonLink, Card } from "@/components/ui";

export default function ClaimsPage() {
  return (
    <div className="space-y-6">
      <header className="animate-step-in">
        <h1 className="text-3xl font-semibold tracking-tight">Claims</h1>
        <p className="mt-1 text-ink-muted">File a claim and follow every step until it&apos;s paid.</p>
      </header>
      <Card className="py-12 text-center">
        <p className="text-lg font-semibold">No claims</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
          With an active policy, you&apos;ll file claims here with photos of the damage, then track the review and payout.
        </p>
        <ButtonLink href="/dashboard/policies" variant="secondary" className="mt-6">
          View policies
        </ButtonLink>
      </Card>
    </div>
  );
}
