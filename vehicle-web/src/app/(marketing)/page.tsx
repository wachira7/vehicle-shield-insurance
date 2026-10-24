import Image from "next/image";
import heroPhoto from "@/assets/photos/hero-night-drive.webp";
import nairobiPhoto from "@/assets/photos/nairobi-street.webp";
import toyotaPhoto from "@/assets/photos/toyota-front.webp";
import trafficStopPhoto from "@/assets/photos/traffic-stop.webp";
import { HeroVisual } from "@/components/landing/hero-visual";
import { PriceSlider } from "@/components/landing/price-slider";
import { CountUp, Reveal } from "@/components/motion";
import { ButtonLink, Card } from "@/components/ui";
import { fetchPoolStats, poolBalanceUnits } from "@/lib/api";

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

const claimJourney = [
  { title: "You file", body: "Upload photos of the damage from your phone and say how much you're claiming." },
  { title: "An assessor reviews", body: "An assessor checks your photos against your policy. You see the moment it's picked up." },
  { title: "A decision, with reasons", body: "Approved with an amount, or declined with a written reason. Never just silence." },
  { title: "Paid to your wallet", body: "Approved amounts, less your deductible, go straight to the wallet holding the policy." },
];

const comparison = [
  { topic: "How your price is set", them: "Usually a single number", us: "Every quote lists each factor and its effect" },
  { topic: "Following a claim", them: "Calls and emails", us: "Each step recorded publicly with a timestamp" },
  { topic: "Where premiums go", them: "Inside the company's accounts", us: "A public pool anyone can check, any time" },
  { topic: "Proof of cover", them: "A paper certificate or a sticker", us: "A policy in your wallet anyone can verify" },
  { topic: "Getting paid", them: "A transfer after the paperwork", us: "Straight to your wallet once approved" },
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
    q: "Who can see my photos and details?",
    a: "Only you and our assessors. Photos are encrypted before they're stored, and your number plate never goes on the blockchain. Only an anonymous vehicle ID does.",
  },
  {
    q: "What if I sell my car?",
    a: "Your policy is held in your wallet and can be transferred to the buyer, who then receives any payouts on it.",
  },
  {
    q: "What does “on-chain” actually mean for me?",
    a: "The rules for buying, claiming and paying out run as public code that nobody can quietly change, and the pool's money can be checked by anyone at any time.",
  },
  {
    q: "Is this live with real money?",
    a: "Not yet. VehicleShield is running on the Sepolia test network with test USDC while we finish testing.",
  },
];

const credits = [
  { name: "Hyundai Motor Group", href: "https://unsplash.com/@hyundaimotorgroup" },
  { name: "Michael Njoroge", href: "https://unsplash.com/@activatemedia" },
  { name: "lens zone", href: "https://unsplash.com/@lenszone" },
  { name: "Noor Yoosuf", href: "https://unsplash.com/@nur_yousuf" },
];

const unitsToNumber = (units: bigint | string) => Number(BigInt(units) / 10_000n) / 100;

export default async function Home() {
  const stats = await fetchPoolStats();

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <Image
          src={heroPhoto}
          alt=""
          priority
          placeholder="blur"
          sizes="100vw"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center] opacity-50"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg via-bg/85 to-bg/30" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-bg to-transparent" />
        <div className="hero-exit mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs font-medium text-ink-muted backdrop-blur">
              <span className="size-1.5 rounded-full bg-action" />
              Now on the Sepolia test network
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              Car insurance you can check, with claims you can track.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-muted">
              See your price in seconds and exactly how it was worked out. Cover lives in your wallet, and the pool
              that pays claims is open for anyone to inspect.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/quote">Get a quote, no wallet needed</ButtonLink>
              <ButtonLink href="#how-it-works" variant="secondary">
                How it works
              </ButtonLink>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* Live stats */}
      {stats && (
        <section id="transparency" aria-labelledby="stats-heading" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <h2 id="stats-heading" className="sr-only">
            Live pool figures
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Held to pay claims", value: unitsToNumber(poolBalanceUnits(stats)), format: "usd" as const },
              { label: "Policies sold", value: stats.policiesSold, format: "integer" as const },
              {
                label: "Paid out in claims",
                value: unitsToNumber(stats.payoutsTotal),
                format: "usd" as const,
                note: `across ${stats.claimsPaid} claims`,
              },
            ].map((stat, index) => (
              <Reveal key={stat.label} delay={index * 100}>
                <Card>
                  <p className="text-sm text-ink-muted">{stat.label}</p>
                  <p className="mt-2 text-3xl font-semibold">
                    <CountUp value={stat.value} format={stat.format} />
                  </p>
                  {stat.note && <p className="mt-1 text-xs text-ink-faint">{stat.note}</p>}
                </Card>
              </Reveal>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-faint">Read live from the blockchain, refreshed every 30 seconds.</p>
        </section>
      )}

      {/* Try it */}
      <section aria-labelledby="try-heading" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <Reveal>
          <h2 id="try-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            What would it cost you?
          </h2>
          <p className="mt-2 text-ink-muted">Drag to your car&apos;s value. Real prices from the same engine as the full quote.</p>
        </Reveal>
        <Reveal delay={100} className="mt-6">
          <PriceSlider />
        </Reveal>
      </section>

      {/* How it works */}
      <section id="how-it-works" aria-labelledby="how-heading" className="border-y border-line/60 bg-surface/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <Reveal>
              <h2 id="how-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Covered in three steps
              </h2>
            </Reveal>
            <ol className="mt-8 space-y-4">
              {steps.map((step, index) => (
                <Reveal as="li" key={step.title} delay={index * 120}>
                  <div className="flex gap-4 rounded-2xl border border-line bg-surface p-5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-action/15 text-sm font-semibold text-action">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold">{step.title}</h3>
                      <p className="mt-1 text-sm text-ink-muted">{step.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
          <Reveal delay={150} className="relative">
            <Image
              src={toyotaPhoto}
              alt="Front view of a white Toyota sedan, the kind of photo you take to verify your car"
              placeholder="blur"
              sizes="(min-width: 1024px) 560px, 100vw"
              className="aspect-[4/3] w-full rounded-3xl object-cover"
            />
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 sm:bottom-6 sm:left-6">
              {["Front", "Back", "Left", "Right", "Interior", "Odometer"].map((view, index) => (
                <span
                  key={view}
                  className={`rounded-full px-3 py-1 text-xs font-medium backdrop-blur ${
                    index === 0 ? "bg-action text-action-ink" : "bg-bg/75 text-ink-muted"
                  }`}
                >
                  {index === 0 ? "✓ " : ""}
                  {view}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Claim journey */}
      <section aria-labelledby="claims-heading" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <h2 id="claims-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            A claim you can follow, step by step
          </h2>
          <p className="mt-2 max-w-2xl text-ink-muted">
            Every claim moves through the same four steps, each recorded with the time it happened.
          </p>
        </Reveal>
        <ol className="relative mt-10 grid gap-6 md:grid-cols-4">
          <div aria-hidden className="absolute left-4 top-4 hidden h-px w-[calc(100%-2rem)] bg-line md:block" />
          {claimJourney.map((item, index) => (
            <Reveal as="li" key={item.title} delay={index * 150} className="relative">
              <span className="relative grid size-8 place-items-center rounded-full border border-action bg-bg text-sm font-semibold text-action">
                {index + 1}
              </span>
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{item.body}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Everyday roads */}
      <section aria-labelledby="roads-heading" className="relative isolate overflow-hidden">
        <Image
          src={nairobiPhoto}
          alt="Busy Nairobi street with matatus, cars and motorbikes on a sunny day"
          placeholder="blur"
          sizes="100vw"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-bg/80" />
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <Reveal className="max-w-xl">
            <h2 id="roads-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Made for everyday cars on everyday roads
            </h2>
            <p className="mt-4 text-ink-muted">
              Cover is priced on your actual car (its age, mileage and condition), confirmed from your own photos.
              Private or business use, from a month to a year.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Then and now */}
      <section aria-labelledby="compare-heading" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <h2 id="compare-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            What changes when insurance is open
          </h2>
        </Reveal>
        <Reveal delay={100} className="mt-8">
          <div className="overflow-hidden rounded-2xl border border-line">
            <div className="hidden grid-cols-[1fr_1fr_1.3fr] bg-surface-2 px-6 py-3 text-xs font-medium uppercase tracking-wider text-ink-faint sm:grid">
              <span />
              <span>Typical insurer</span>
              <span className="text-action">VehicleShield</span>
            </div>
            {comparison.map((row) => (
              <div
                key={row.topic}
                className="grid gap-1 border-t border-line bg-surface px-6 py-4 first:border-t-0 sm:grid-cols-[1fr_1fr_1.3fr] sm:gap-4 sm:first:border-t"
              >
                <span className="font-medium">{row.topic}</span>
                <span className="text-sm text-ink-faint">
                  <span className="sm:hidden">Typical: </span>
                  {row.them}
                </span>
                <span className="text-sm text-ink">
                  <span className="text-action sm:hidden">VehicleShield: </span>
                  {row.us}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Proof of cover */}
      <section aria-labelledby="proof-heading" className="border-y border-line/60 bg-surface/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <Reveal className="relative order-2 lg:order-1">
            <Image
              src={trafficStopPhoto}
              alt="Police car with blue lights at a night-time traffic stop"
              placeholder="blur"
              sizes="(min-width: 1024px) 560px, 100vw"
              className="aspect-[4/3] w-full rounded-3xl object-cover"
            />
            <div className="absolute -bottom-6 right-4 w-40 rounded-2xl border border-line bg-surface p-3 shadow-2xl shadow-black/50 sm:right-8">
              <ExampleQr />
              <p className="mt-2 text-center text-[11px] text-ink-muted">Policy #1042 · Active</p>
            </div>
          </Reveal>
          <Reveal delay={100} className="order-1 lg:order-2">
            <h2 id="proof-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Proof of cover in your pocket
            </h2>
            <p className="mt-4 text-ink-muted">
              Show a QR code and anyone (a traffic officer, a garage, a buyer) can check that your policy is real
              and active, straight from the blockchain. No phone calls, no paperwork to forge.
            </p>
            <p className="mt-3 text-sm text-ink-faint">Coming with the policy dashboard.</p>
          </Reveal>
        </div>
      </section>

      {/* Built in the open */}
      <section aria-labelledby="open-heading" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <h2 id="open-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Built in the open
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Verified contracts",
              body: "The code running the policies is published and matched byte-for-byte to what's on the blockchain.",
            },
            {
              title: "Tested on every change",
              body: "Every update runs the full journey, from quote to claim to payout, plus a security scanner, before it can ship.",
            },
            {
              title: "Your data stays yours",
              body: "Photos are encrypted before storage. Only an anonymous vehicle ID ever goes on-chain.",
            },
          ].map((item, index) => (
            <Reveal key={item.title} delay={index * 100}>
              <Card className="h-full">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{item.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <Reveal>
          <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Plain answers
          </h2>
        </Reveal>
        <Reveal delay={100} className="mt-6">
          <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {explainers.map((item) => (
              <details key={item.q} className="group px-6 py-4">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {item.q}
                  <span aria-hidden className="text-xl text-ink-faint transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm text-ink-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Closing call to action */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-action/30 bg-gradient-to-br from-action/15 via-surface to-surface p-10 text-center sm:p-14">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">See your price in under a minute</h2>
            <p className="mx-auto mt-3 max-w-lg text-ink-muted">No sign-up, no wallet, no commitment. Just your car and the cover you want.</p>
            <ButtonLink href="/quote" className="mt-8">
              Get a quote
            </ButtonLink>
          </div>
        </Reveal>
        <p className="mt-8 text-center text-xs text-ink-faint">
          Photos from Unsplash by{" "}
          {credits.map((credit, index) => (
            <span key={credit.name}>
              <a href={credit.href} className="underline decoration-line underline-offset-2 hover:text-ink-muted" rel="noreferrer">
                {credit.name}
              </a>
              {index < credits.length - 2 ? ", " : index === credits.length - 2 ? " and " : ""}
            </span>
          ))}
          .
        </p>
      </section>
    </>
  );
}

/// A decorative QR-style pattern for the example card (not a scannable code).
function ExampleQr() {
  const size = 21;
  const cells: [number, number][] = [];
  let seed = 1042;
  const finder = (x: number, y: number) =>
    [0, size - 7].some((ox) => [0, size - 7].some((oy) => !(ox && oy) && x >= ox && x < ox + 7 && y >= oy && y < oy + 7));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (finder(x, y)) continue;
      seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
      if (seed % 2) cells.push([x, y]);
    }
  }
  const finderAt = (ox: number, oy: number) => (
    <g key={`${ox}-${oy}`}>
      <rect x={ox} y={oy} width={7} height={7} fill="currentColor" />
      <rect x={ox + 1} y={oy + 1} width={5} height={5} fill="white" />
      <rect x={ox + 2} y={oy + 2} width={3} height={3} fill="currentColor" />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${size + 2} ${size + 2}`} className="w-full rounded-lg bg-white text-bg" aria-hidden>
      {finderAt(0, 0)}
      {finderAt(size - 7, 0)}
      {finderAt(0, size - 7)}
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  );
}
