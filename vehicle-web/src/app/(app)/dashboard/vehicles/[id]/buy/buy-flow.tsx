"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, useBalance, useConfig, useReadContract, useSwitchChain } from "wagmi";
import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import { formatUnits, parseEventLogs, parseSignature } from "viem";
import { Steps } from "@/components/steps";
import { useToast } from "@/components/toast";
import { Button, ButtonLink, Card } from "@/components/ui";
import { ApiError, estimateQuote, requestSignedQuote, type Estimate, type SignedQuote, type Vehicle } from "@/lib/api";
import { chain } from "@/lib/chain";
import { describeTxError, explorerTx, insuranceCore, technicalDetails, usdc, usdcIsMock } from "@/lib/contracts";
import { DURATIONS, coverBounds, deductibleOptions, formatCountdown } from "@/lib/cover-options";
import { describeMultiplier, formatUsd, formatUsdcUnits } from "@/lib/format";
import { useSession } from "@/lib/session";
import { connectedWalletClient } from "@/lib/wallet-client";

type Payment =
  | { kind: "idle" }
  | { kind: "minting" }
  | { kind: "signing" }
  | { kind: "sending" }
  | { kind: "confirming"; hash: `0x${string}` }
  | { kind: "error"; message: string; details?: string; hash?: `0x${string}` };

const vehicleDetails = (vehicle: Vehicle) => ({
  year: vehicle.year,
  marketValueUsdc: Number(vehicle.marketValueUsdc),
  mileageKm: vehicle.mileageKm,
  condition: vehicle.condition,
  accidentsLast3Years: vehicle.accidentsLast3Years,
  usage: vehicle.usage,
});

export function BuyFlow({ vehicle }: { vehicle: Vehicle }) {
  const bounds = coverBounds(Number(vehicle.marketValueUsdc));
  const [cover, setCover] = useState(bounds.suggested);
  const [deductible, setDeductible] = useState(() => deductibleOptions(bounds.suggested)[0]);
  const [durationDays, setDurationDays] = useState(365);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [signed, setSigned] = useState<SignedQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [policyId, setPolicyId] = useState<{ id: bigint; hash: `0x${string}` } | null>(null);
  const step = policyId ? 3 : signed ? 2 : 0;

  // Keep the deductible valid when the cover changes.
  useEffect(() => {
    const options = deductibleOptions(cover);
    if (!options.includes(deductible)) setDeductible(options[0]);
  }, [cover, deductible]);

  // Live price from the assessor-confirmed details.
  useEffect(() => {
    if (signed) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      estimateQuote(
        { vehicle: vehicleDetails(vehicle), coverageUsdc: cover, deductibleUsdc: deductible, durationDays },
        controller.signal,
      )
        .then((result) => {
          if (result.kind === "priced") {
            setEstimate(result.estimate);
            setPriceError(null);
          } else setPriceError(result.kind === "declined" ? result.reasons.join(" ") : result.message);
        })
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [vehicle, cover, deductible, durationDays, signed]);

  const { address } = useSession();
  const getFinalPrice = async () => {
    setQuoting(true);
    try {
      setSigned(
        await requestSignedQuote({
          buyer: address!,
          plate: vehicle.plate,
          vehicle: vehicleDetails(vehicle),
          coverageUsdc: cover,
          deductibleUsdc: deductible,
          durationDays,
        }),
      );
    } catch (error) {
      setPriceError(
        error instanceof ApiError && error.status === 403
          ? "This car isn't verified for your account yet."
          : "We couldn't get your final price. Please try again.",
      );
    } finally {
      setQuoting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <Link href={`/dashboard/vehicles/${vehicle.id}`} className="text-sm text-ink-muted hover:text-ink">
          ← {vehicle.make} {vehicle.model}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Buy cover</h1>
        <p className="mt-1 text-ink-muted">
          For your {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.plate}), priced from the details the assessor confirmed.
        </p>
      </header>
      <Steps steps={["Choose", "Review & pay", "Covered"]} current={step === 0 ? 0 : step === 2 ? 1 : 2} />

      {step === 0 && (
        <Card key="choose" className="animate-step-in space-y-7">
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="cover" className="text-sm font-medium">
                Cover amount
              </label>
              <span className="text-2xl font-semibold tabular-nums">{formatUsd(cover, { whole: true })}</span>
            </div>
            <input
              id="cover"
              type="range"
              min={bounds.min}
              max={bounds.max}
              step={100}
              value={cover}
              onChange={(e) => setCover(Number(e.target.value))}
              aria-valuetext={formatUsd(cover, { whole: true })}
              className="mt-3 w-full accent-action"
            />
            <p className="mt-1 text-xs text-ink-faint">
              The most we&apos;d pay in total, up to your car&apos;s verified value of {formatUsd(vehicle.marketValueUsdc, { whole: true })}.
            </p>
          </div>

          <OptionRow
            label="Deductible"
            hint="What you pay towards each claim. Higher means a cheaper policy."
            options={deductibleOptions(cover).map((amount) => ({ value: amount, label: formatUsd(amount, { whole: true }) }))}
            value={deductible}
            onChange={setDeductible}
          />
          <OptionRow
            label="How long"
            options={DURATIONS.map((d) => ({ value: d.days, label: d.label }))}
            value={durationDays}
            onChange={setDurationDays}
          />

          <div className="rounded-2xl border border-line bg-bg/60 p-5" aria-live="polite">
            {priceError ? (
              <p className="text-sm text-warn">{priceError}</p>
            ) : estimate ? (
              <>
                <p className="text-sm text-ink-muted">You&apos;d pay</p>
                <p className="text-3xl font-semibold tabular-nums text-action">{formatUsd(estimate.premiumUsdc)}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {estimate.factors.map((factor) => (
                    <li key={factor.name} className="rounded-md bg-surface-2 px-2 py-1 text-xs text-ink-muted">
                      {factor.name} {describeMultiplier(factor.multiplier)}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="h-16 animate-pulse rounded-lg bg-surface-2" />
            )}
          </div>

          <Button className="w-full" disabled={!estimate || Boolean(priceError) || quoting} onClick={getFinalPrice}>
            {quoting ? "Getting your final price…" : "Review and get final price"}
          </Button>
        </Card>
      )}

      {step === 2 && signed && (
        <PayStep
          key="pay"
          signed={signed}
          durationDays={durationDays}
          onBack={() => setSigned(null)}
          onRequote={getFinalPrice}
          onPaid={(id, hash) => setPolicyId({ id, hash })}
        />
      )}

      {step === 3 && policyId && signed && (
        <Card key="done" className="animate-step-in py-10 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-action/15 text-3xl text-action">✓</span>
          <h2 className="mt-4 text-2xl font-semibold">You&apos;re covered</h2>
          <p className="mt-2 text-ink-muted">
            Policy #{policyId.id.toString()} · {formatUsdcUnits(signed.quote.coverage, { whole: true })} cover for{" "}
            {DURATIONS.find((d) => d.days === durationDays)?.label.toLowerCase()}
          </p>
          <p className="mt-1 text-sm text-ink-faint">Your policy is in your wallet and starts now.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/dashboard/policies">View policy</ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">
              Back to dashboard
            </ButtonLink>
          </div>
          <a href={explorerTx(policyId.hash)} target="_blank" rel="noreferrer" className="mt-5 inline-block text-xs text-ink-faint underline">
            View the transaction
          </a>
        </Card>
      )}
    </div>
  );
}

function PayStep({
  signed,
  durationDays,
  onBack,
  onRequote,
  onPaid,
}: {
  signed: SignedQuote;
  durationDays: number;
  onBack: () => void;
  onRequote: () => Promise<void>;
  onPaid: (policyId: bigint, hash: `0x${string}`) => void;
}) {
  const config = useConfig();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { address, chainId } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [payment, setPayment] = useState<Payment>({ kind: "idle" });
  const [now, setNow] = useState(() => Date.now());
  const premium = BigInt(signed.quote.premium);
  const msLeft = new Date(signed.expiresAt).getTime() - now;
  const expired = msLeft <= 0;
  const busy = ["minting", "signing", "sending", "confirming"].includes(payment.kind);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const balance = useReadContract({ ...usdc, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: Boolean(address) } });
  const gas = useBalance({ address, query: { enabled: Boolean(address) } });
  const hasUsdc = balance.data !== undefined && balance.data >= premium;
  const hasGas = gas.data !== undefined && gas.data.value > 0n;
  const wrongAccount = address && address.toLowerCase() !== signed.quote.buyer.toLowerCase();
  const wrongChain = chainId !== chain.id;
  const start = new Date();
  const end = new Date(start.getTime() + durationDays * 86_400_000);

  const mintTestUsdc = async () => {
    setPayment({ kind: "minting" });
    try {
      const wallet = await connectedWalletClient(config);
      const hash = await wallet.writeContract({ ...usdc, functionName: "mint", args: [address!, premium + 100_000_000n] });
      await waitForTransactionReceipt(config, { hash, chainId: chain.id });
      await balance.refetch();
      setPayment({ kind: "idle" });
      toast("Test USDC added to your wallet");
    } catch (error) {
      console.error("Payment step failed", error);
      setPayment({ kind: "error", message: describeTxError(error), details: technicalDetails(error) });
    }
  };

  const pay = async () => {
    try {
      // 1. A free signature allowing the exact premium to be collected (EIP-2612 permit).
      setPayment({ kind: "signing" });
      const [, name, version, tokenChainId, verifyingContract] = await readContract(config, { ...usdc, functionName: "eip712Domain" });
      const nonce = await readContract(config, { ...usdc, functionName: "nonces", args: [address!] });
      const permitDeadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);
      const permit = parseSignature(
        await (await connectedWalletClient(config)).signTypedData({
          domain: { name, version, chainId: Number(tokenChainId), verifyingContract },
          types: {
            Permit: [
              { name: "owner", type: "address" },
              { name: "spender", type: "address" },
              { name: "value", type: "uint256" },
              { name: "nonce", type: "uint256" },
              { name: "deadline", type: "uint256" },
            ],
          },
          primaryType: "Permit",
          message: { owner: address!, spender: insuranceCore.address, value: premium, nonce, deadline: permitDeadline },
        }),
      );

      // 2. One transaction: collect the premium and issue the policy.
      setPayment({ kind: "sending" });
      const q = signed.quote;
      const hash = await (await connectedWalletClient(config)).writeContract({
        ...insuranceCore,
        functionName: "buyPolicyWithPermit",
        args: [
          {
            buyer: q.buyer,
            vehicleId: q.vehicleId,
            coverage: BigInt(q.coverage),
            premium: BigInt(q.premium),
            deductible: BigInt(q.deductible),
            duration: BigInt(q.duration),
            deadline: BigInt(q.deadline),
            nonce: q.nonce,
          },
          signed.signature,
          permitDeadline,
          Number(permit.v ?? BigInt(permit.yParity + 27)),
          permit.r,
          permit.s,
        ],
      });

      setPayment({ kind: "confirming", hash });
      const receipt = await waitForTransactionReceipt(config, { hash, chainId: chain.id });
      if (receipt.status !== "success") {
        setPayment({ kind: "error", message: "The payment was reverted on the network. Nothing was charged.", hash });
        return;
      }
      const [purchased] = parseEventLogs({ abi: insuranceCore.abi, logs: receipt.logs, eventName: "PolicyPurchased" });
      void queryClient.invalidateQueries({ queryKey: ["policies"] });
      // The indexer picks the policy up within seconds; refresh again shortly after.
      setTimeout(() => void queryClient.invalidateQueries({ queryKey: ["policies"] }), 6000);
      onPaid(purchased.args.policyId, hash);
    } catch (error) {
      console.error("Payment step failed", error);
      setPayment({ kind: "error", message: describeTxError(error), details: technicalDetails(error) });
    }
  };

  return (
    <Card className="animate-step-in space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Review and pay</h2>
          <p className="text-sm text-ink-muted">Check the details, then confirm in your wallet.</p>
        </div>
        <span className={`rounded-lg px-2.5 py-1 text-xs font-medium tabular-nums ${expired ? "bg-danger/10 text-danger" : "bg-surface-2 text-ink-muted"}`}>
          {expired ? "Price expired" : `Price held ${formatCountdown(msLeft)}`}
        </span>
      </div>

      <dl className="divide-y divide-line rounded-2xl border border-line">
        {[
          ["You pay", formatUsdcUnits(signed.quote.premium), "once, in USDC"],
          ["Cover", formatUsdcUnits(signed.quote.coverage, { whole: true }), "the most paid out in total"],
          ["Deductible", formatUsdcUnits(signed.quote.deductible, { whole: true }), "you pay this part of each claim"],
          ["Covered from", start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), "starts as soon as you pay"],
          ["Covered until", end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), ""],
        ].map(([label, value, note]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-ink-muted">{label}</dt>
            <dd className="text-right">
              <span className="font-semibold tabular-nums">{value}</span>
              {note && <span className="block text-xs text-ink-faint">{note}</span>}
            </dd>
          </div>
        ))}
      </dl>

      {wrongAccount ? (
        <Notice tone="warn">This price was issued to your signed-in wallet, but a different account is connected. Switch back to continue.</Notice>
      ) : wrongChain ? (
        <Notice tone="warn">
          Your wallet is on another network.{" "}
          <button className="font-semibold text-action underline" disabled={switching} onClick={() => switchChain({ chainId: chain.id })}>
            Switch to {chain.name}
          </button>
        </Notice>
      ) : !hasGas && gas.data ? (
        <Notice tone="warn">
          Your wallet needs a little Sepolia ETH for the network fee. Send some to{" "}
          <span className="break-all font-mono">{address}</span>, then come back. (Live, we cover this fee for you.)
        </Notice>
      ) : !hasUsdc && balance.data !== undefined ? (
        <Notice tone="info">
          You have {formatUsdcUnits(balance.data)} USDC; this policy costs {formatUsdcUnits(premium)}.
          {usdcIsMock && (
            <button className="ml-1 font-semibold text-action underline" disabled={busy} onClick={mintTestUsdc}>
              {payment.kind === "minting" ? "Adding test USDC…" : "Get test USDC"}
            </button>
          )}
        </Notice>
      ) : null}

      {payment.kind === "error" && (
        <Notice tone="error">
          {payment.message}
          {payment.hash && (
            <a href={explorerTx(payment.hash)} target="_blank" rel="noreferrer" className="ml-1 underline">
              View transaction
            </a>
          )}
          {payment.details && (
            <details className="mt-2 text-xs text-ink-muted">
              <summary className="cursor-pointer">Technical details</summary>
              <p className="mt-1 break-words font-mono">{payment.details}</p>
            </details>
          )}
        </Notice>
      )}

      {expired ? (
        <Button className="w-full" onClick={() => void onRequote()}>
          Get a fresh price
        </Button>
      ) : (
        <Button className="w-full" disabled={busy || !hasUsdc || !hasGas || Boolean(wrongAccount) || wrongChain} onClick={pay}>
          {payment.kind === "signing"
            ? "Approve the payment in your wallet…"
            : payment.kind === "sending"
              ? "Confirm the transaction in your wallet…"
              : payment.kind === "confirming"
                ? "Confirming on the network…"
                : `Pay ${formatUsdcUnits(premium)} and get covered`}
        </Button>
      )}
      {payment.kind === "confirming" && (
        <p className="text-center text-xs text-ink-faint">
          Usually takes about 15 seconds.{" "}
          <a href={explorerTx(payment.hash)} target="_blank" rel="noreferrer" className="underline">
            Track it
          </a>
        </p>
      )}
      {!busy && (
        <button type="button" onClick={onBack} className="w-full text-center text-sm text-ink-muted hover:text-ink">
          Change cover
        </button>
      )}
      <p className="text-center text-xs text-ink-faint">
        Balance {balance.data !== undefined ? formatUnits(balance.data, 6) : "…"} USDC. One free signature and one
        transaction; no separate approval.
      </p>
    </Card>
  );
}

function Notice({ tone, children }: { tone: "warn" | "info" | "error"; children: React.ReactNode }) {
  const styles = {
    warn: "border-warn/30 bg-warn/10",
    info: "border-line bg-surface-2",
    error: "border-danger/30 bg-danger/10",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border p-4 text-sm ${styles[tone]}`}>
      {children}
    </div>
  );
}

function OptionRow<T extends number>({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label}>
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-xl border px-4 text-sm font-medium tabular-nums transition-colors ${
              option.value === value ? "border-action bg-action/10 text-ink" : "border-line bg-bg text-ink-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
