"use client";

import { formatPhone } from "@/lib/phone";
import { useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { shortAddress } from "@/components/app-header";
import { ButtonLink, Card } from "@/components/ui";
import { useSession } from "@/lib/session";

const providerNames: Record<string, string> = {
  google: "Google",
  apple: "Apple",
  x: "X",
  discord: "Discord",
  github: "GitHub",
  email: "email",
};

/// The signed-in account. `staff` words it for an assessor, whose wallet signs decisions rather
/// than holding policies.
export function AccountOverview({ staff = false }: { staff?: boolean }) {
  const { address, profile } = useSession();
  const { embeddedWalletInfo } = useAppKitAccount();
  const [copied, setCopied] = useState(false);
  const method = embeddedWalletInfo?.authProvider ? providerNames[embeddedWalletInfo.authProvider] : undefined;

  const copy = async () => {
    await navigator.clipboard.writeText(address!);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="animate-step-in">
        <h1 className="text-3xl font-semibold tracking-tight">
          Account
        </h1>
        <p className="mt-1 text-ink-muted">
          Signed in {method ? `with ${method}` : "with your wallet"}.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Your details</h2>
            <ButtonLink href={`/register?next=${staff ? "/assessor/account" : "/dashboard/account"}`} variant="ghost" className="px-0 py-0">
              Edit
            </ButtonLink>
          </div>
          {profile ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-ink-faint">Name</dt>
                <dd>{profile.fullName}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Email</dt>
                <dd>{profile.email}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Phone</dt>
                <dd>{profile.phone ? formatPhone(profile.phone) : "Not added"}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              {staff ? "Add your name: it's shown on the decisions you make." : "Add your name and email so we can reach you about claims."}
            </p>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold">Your wallet</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {staff ? "Signs your review decisions on-chain. Only you control it." : "Policies and payouts are held here. Only you control it."}
          </p>
          <button
            type="button"
            onClick={copy}
            className="mt-4 flex w-full items-center justify-between rounded-xl border border-line bg-bg px-3 py-3 font-mono text-sm hover:border-action"
          >
            {shortAddress(address!)}
            <span className="font-sans text-xs text-ink-muted">{copied ? "Copied" : "Copy"}</span>
          </button>
        </Card>
      </div>
    </div>
  );
}
