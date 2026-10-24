"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount, useSwitchChain } from "wagmi";
import { Steps } from "@/components/steps";
import { Button, Card } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { safeNext } from "@/lib/redirect";
import { useSession } from "@/lib/session";
import { chain } from "@/lib/chain";

const STEPS = ["Connect", "Confirm it's you", "Your details"];

function describeError(error: unknown): string {
  const text = `${(error as Error)?.name ?? ""} ${(error as Error)?.message ?? ""}`;
  if (/UserRejected|rejected|denied|cancel/i.test(text)) {
    return "You cancelled the signature, so nothing was sent. Try again when you're ready.";
  }
  if (error instanceof ApiError && error.status === 0) {
    return "We can't reach VehicleShield right now. Check your connection and try again.";
  }
  if (error instanceof ApiError && error.status === 401) {
    return "We couldn't verify that sign-in. Please try again.";
  }
  return "Something went wrong while signing in. Please try again.";
}

export function SignInFlow() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { open } = useAppKit();
  const { isConnected, chainId, status: walletStatus } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { status, profile, signIn } = useSession();
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  const onWrongNetwork = isConnected && chainId !== chain.id;

  const finish = useCallback(
    (needsProfile: boolean) => router.replace(needsProfile ? `/register?next=${encodeURIComponent(next)}` : next),
    [router, next],
  );

  // Already signed in: carry on.
  useEffect(() => {
    if (status === "signed-in" && profile !== undefined && !signing) finish(profile === null);
  }, [status, profile, signing, finish]);

  const confirm = useCallback(async () => {
    setError(null);
    setSigning(true);
    try {
      const { needsProfile } = await signIn();
      finish(needsProfile);
    } catch (caught) {
      setError(describeError(caught));
      setSigning(false);
    }
  }, [signIn, finish]);

  // Ask for the signature as soon as a wallet is connected on the right network, once.
  useEffect(() => {
    if (isConnected && !onWrongNetwork && status === "signed-out" && !attempted.current) {
      attempted.current = true;
      void confirm();
    }
    if (!isConnected) attempted.current = false;
  }, [isConnected, onWrongNetwork, status, confirm]);

  const step = !isConnected ? 0 : 1;

  return (
    <Card className="p-6 sm:p-8">
      <Steps steps={STEPS} current={step} />

      <div key={`${step}-${onWrongNetwork}-${Boolean(error)}`} className="animate-step-in mt-8" aria-live="polite">
        {!isConnected ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in or create an account</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Use Google, Apple, X, email or a crypto wallet. New here? Signing in creates your account. No password
              to remember.
            </p>
            <Button className="mt-6 w-full" onClick={() => open()} disabled={walletStatus === "connecting" || walletStatus === "reconnecting"}>
              {walletStatus === "connecting" || walletStatus === "reconnecting" ? <Spinner label="Connecting" /> : "Continue"}
            </Button>
            <ul className="mt-6 grid grid-cols-2 gap-2 text-xs text-ink-muted sm:grid-cols-4">
              {["Google", "Apple · X", "Email", "Wallet"].map((method) => (
                <li key={method} className="rounded-lg border border-line bg-bg/50 px-3 py-2 text-center">
                  {method}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-ink-faint">
              Signing in with Google or email creates a secure wallet for you automatically, so your policies and
              payouts belong to you.
            </p>
          </>
        ) : onWrongNetwork ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Switch to {chain.name}</h1>
            <p className="mt-2 text-sm text-ink-muted">
              VehicleShield runs on the {chain.name} test network. Your wallet is on a different one.
            </p>
            <Button className="mt-6 w-full" onClick={() => switchChain({ chainId: chain.id })} disabled={switching}>
              {switching ? <Spinner label="Switching" /> : `Switch to ${chain.name}`}
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Confirm it&apos;s you</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Approve the sign-in message in your wallet. It&apos;s free and doesn&apos;t send a transaction or move
              any money.
            </p>
            {error ? (
              <div role="alert" className="mt-6 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-ink">
                {error}
              </div>
            ) : null}
            <Button className="mt-6 w-full" onClick={confirm} disabled={signing}>
              {signing ? <Spinner label="Waiting for your signature" /> : error ? "Try again" : "Sign the message"}
            </Button>
            <button
              type="button"
              onClick={() => open({ view: "Account" })}
              className="mt-3 w-full text-center text-sm text-ink-muted hover:text-ink"
            >
              Use a different account
            </button>
          </>
        )}
      </div>
    </Card>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {label}
    </span>
  );
}
