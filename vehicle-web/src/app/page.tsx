import { Card, ButtonLink } from "@/components/ui";
import { fetchPoolStats, poolBalanceUnits } from "@/lib/api";
import { formatUsdcUnits } from "@/lib/format";

const steps = [
  {
    title: "Get a price",
    body: "Tell us about your car and the cover you want. You see the price and exactly what shaped it, with no sign-up.",
  },
  {
    title: "Verify your car",
    body: "Connect a wallet and add six photos of your car. An assessor checks the details before cover starts.",
  },
  {
    title: "Pay and you're covered",
    body: "Pay in USDC. Your policy is active straight away and lives in your wallet, so you can prove cover anywhere.",
  },
];

const explainers = [
  {
    q: "How is my premium worked out?",
    a: "A base of 4% of your cover per year, adjusted for your car's age, mileage, condition, claims history and use. A higher deductible lowers the price. Every quote lists each factor, so nothing is hidden.",
  },
  {
    q: "What is the deductible?",
    a: "The part of each claim you pay yourself. If your deductible is $500 and an assessor approves $1,800, you receive $1,300.",
  },
  {
    q: "How do claims get paid?",
    a: "You upload photos and file a claim. An assessor reviews it, and if it's approved the payout goes straight to the wallet holding the policy. Every step is recorded publicly, so you can track it.",
  },
  {
    q: "Who can see my photos and details?",
    a: "Only you and our assessors. Photos are encrypted before they're stored, and your number plate never goes on the blockchain. Only an anonymous vehicle ID does.",
  },
  {
    q: "What does “on-chain” actually mean for me?",
    a: "The rules for buying, claiming and paying out run as public code that nobody can quietly change, and the pool's money can be checked by anyone at any time.",
  },
];

export default async function Home() {
  const stats = await fetchPoolStats();

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-24">
        <p className="mb-4 inline-flex rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted">
          Now on the Sepolia test network
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Car insurance you can check, with claims you can track.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-muted">
          See your price in seconds and exactly how it was worked out. Cover lives in your wallet, and the pool
          that pays claims is open for anyone to inspect.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/quote">Get a quote, no wallet needed</ButtonLink>
          <ButtonLink href="#how-it-works" variant="secondary">
            How it works
          </ButtonLink>
        </div>
      </section>

      {stats && (
        <section id="transparency" aria-labelledby="stats-heading" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <h2 id="stats-heading" className="sr-only">
            Live pool figures
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-ink-muted">Held to pay claims</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{formatUsdcUnits(poolBalanceUnits(stats), { whole: true })}</p>
            </Card>
            <Card>
              <p className="text-sm text-ink-muted">Policies sold</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{stats.policiesSold.toLocaleString("en-US")}</p>
            </Card>
            <Card>
              <p className="text-sm text-ink-muted">Paid out in claims</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{formatUsdcUnits(stats.payoutsTotal, { whole: true })}</p>
              <p className="mt-1 text-xs text-ink-faint">across {stats.claimsPaid} claims</p>
            </Card>
          </div>
          <p className="mt-3 text-xs text-ink-faint">Read live from the blockchain, refreshed every 30 seconds.</p>
        </section>
      )}

      <section id="how-it-works" aria-labelledby="how-heading" className="border-y border-line/60 bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="how-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Covered in three steps
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title}>
                <Card className="h-full">
                  <span className="grid size-8 place-items-center rounded-full bg-action/15 text-sm font-semibold text-action">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{step.body}</p>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Plain answers
        </h2>
        <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
          {explainers.map((item) => (
            <details key={item.q} className="group px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {item.q}
                <span aria-hidden className="text-ink-faint transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-ink-muted">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 text-center">
          <ButtonLink href="/quote">See your price</ButtonLink>
        </div>
      </section>
    </>
  );
}
