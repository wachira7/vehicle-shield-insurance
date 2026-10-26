"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import nairobiPhoto from "@/assets/photos/nairobi-street.webp";
import toyotaPhoto from "@/assets/photos/toyota-front.webp";

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
);

const CUSTOMER = {
  photo: nairobiPhoto,
  eyebrow: "VehicleShield",
  title: "Car insurance you can check.",
  points: [
    { icon: icon(<path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3z" />), title: "Checked by a real assessor", body: "Six photos of your car, reviewed before you're priced." },
    { icon: icon(<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13l2 2 4-4" />), title: "Claims you can follow", body: "Every step on a timeline, and the payout lands in your wallet." },
    { icon: icon(<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4" />), title: "Proof of cover anyone can check", body: "A QR code that police or a garage can confirm on the blockchain." },
  ],
};

const STAFF = {
  photo: toyotaPhoto,
  eyebrow: "Assessor console",
  title: "Decide claims with the evidence side by side.",
  points: [
    { icon: icon(<path d="M3 5h8v14H3zM13 5h8v14h-8z" />), title: "Claim photos beside the insured car", body: "Compare colour, plate and earlier marks at a glance." },
    { icon: icon(<path d="M12 3l9 16H3zM12 10v4M12 17h.01" />), title: "Warning signs, flagged for you", body: "Reused, old or out-of-place photos are pointed out before you decide." },
    { icon: icon(<path d="M12 3v18M5 10l7-7 7 7" />), title: "Every decision on the record", body: "Approvals and declines are signed by your account and recorded on-chain." },
  ],
};

/// Sign-in and registration: on large screens, a branded panel beside the form; on phones, the
/// form alone. `?next=/assessor…` switches the panel to the staff version.
export function AuthShell({ children }: { children: ReactNode }) {
  const staff = (useSearchParams().get("next") ?? "").startsWith("/assessor");
  const content = staff ? STAFF : CUSTOMER;

  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <aside className="relative isolate hidden overflow-hidden border-r border-line/60 lg:flex lg:flex-col lg:justify-end">
        <Image src={content.photo} alt="" fill priority placeholder="blur" sizes="55vw" className="-z-20 object-cover opacity-60" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-bg via-bg/80 to-bg/20" />
        <div className="animate-step-in max-w-xl p-12 xl:p-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-action">{content.eyebrow}</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">{content.title}</h2>
          <ul className="mt-10 space-y-6">
            {content.points.map((point) => (
              <li key={point.title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-action/30 bg-action/10 text-action">{point.icon}</span>
                <span>
                  <span className="block font-medium">{point.title}</span>
                  <span className="mt-0.5 block text-sm text-ink-muted">{point.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-12 text-xs text-ink-faint">Photo: Unsplash</p>
        </div>
      </aside>
      <div className="flex flex-col items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
