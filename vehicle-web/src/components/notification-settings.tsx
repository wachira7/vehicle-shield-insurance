"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { Card } from "@/components/ui";
import { saveProfile } from "@/lib/api";
import { formatPhone } from "@/lib/phone";
import { useSession } from "@/lib/session";

/// Email and SMS switches. In-app notifications are always on.
export function NotificationSettings({ staff = false }: { staff?: boolean }) {
  const { token, profile, setProfile } = useSession();
  const toast = useToast();
  const [saving, setSaving] = useState<"notifyEmail" | "notifySms" | null>(null);
  if (!profile) return null;

  const toggle = async (key: "notifyEmail" | "notifySms") => {
    const next = !(profile[key] ?? true);
    setSaving(key);
    try {
      const { profile: saved } = await saveProfile(token!, {
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone ?? undefined,
        notifyEmail: profile.notifyEmail ?? true,
        notifySms: profile.notifySms ?? true,
        [key]: next,
      });
      setProfile(saved);
      toast(`${key === "notifyEmail" ? "Email" : "Text"} updates ${next ? "on" : "off"}`);
    } catch {
      toast("Couldn't save that. Try again.", "error");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <h2 className="font-semibold">Notifications</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {staff
          ? "New claims and cars to verify always show under the bell. Choose whether they also come by email."
          : "Updates on your cover and claims always show under the bell. Choose how else to hear about them."}
      </p>
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
        <Setting
          label="Email"
          detail={profile.email}
          on={profile.notifyEmail ?? true}
          busy={saving === "notifyEmail"}
          onToggle={() => toggle("notifyEmail")}
        />
        {!staff && (
          <Setting
            label="Text messages"
            detail={
              profile.phone ? (
                formatPhone(profile.phone)
              ) : (
                <>
                  Add a phone number in{" "}
                  <Link href="/register?next=/dashboard/account" className="text-action hover:underline">
                    your details
                  </Link>{" "}
                  to get texts
                </>
              )
            }
            on={Boolean(profile.phone) && (profile.notifySms ?? true)}
            disabled={!profile.phone}
            busy={saving === "notifySms"}
            onToggle={() => toggle("notifySms")}
          />
        )}
      </ul>
    </Card>
  );
}

function Setting({
  label,
  detail,
  on,
  busy,
  disabled,
  onToggle,
}: {
  label: string;
  detail: React.ReactNode;
  on: boolean;
  busy: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-ink-faint">{detail}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled || busy}
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-action" : "bg-line"}`}
      >
        <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </li>
  );
}
