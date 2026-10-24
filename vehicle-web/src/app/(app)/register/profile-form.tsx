"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { Steps } from "@/components/steps";
import { Button, Card } from "@/components/ui";
import { ApiError, saveProfile } from "@/lib/api";
import { useFieldErrors } from "@/lib/form";
import { safeNext } from "@/lib/redirect";
import { useSession } from "@/lib/session";

type Fields = { fullName: string; email: string; phone: string };

export function ProfileForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { token, profile, setProfile } = useSession();
  const { embeddedWalletInfo } = useAppKitAccount();
  const [fields, setFields] = useState<Fields>({ fullName: "", email: "", phone: "" });
  // From the server, for anything it rejects that the checks below don't catch.
  const [serverErrors, setServerErrors] = useState<Partial<Fields> & { form?: string }>({});
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const isNew = profile === null;

  // Start from the saved profile, or the email from a Google/email sign-in.
  useEffect(() => {
    if (profile) setFields({ fullName: profile.fullName, email: profile.email, phone: profile.phone ?? "" });
    else if (embeddedWalletInfo?.user?.email) setFields((f) => ({ ...f, email: f.email || embeddedWalletInfo.user!.email! }));
  }, [profile, embeddedWalletInfo]);

  // The same rules the API applies (vehicle-api/src/profile.ts), checked as you go.
  const checks: Partial<Fields> = {
    ...(fields.fullName.trim().length < 2 && { fullName: "Enter your full name" }),
    ...(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email.trim()) && { email: "Enter an email like name@example.com" }),
    ...(fields.phone.trim() && !/^\+?[0-9][0-9 ()-]{6,19}$/.test(fields.phone.trim()) && { phone: "Enter a phone number like +254 712 345 678" }),
  };
  const { shown, blur, attemptSubmit } = useFieldErrors(checks);
  const errorFor = (key: keyof Fields) => shown(key) ?? serverErrors[key];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !attemptSubmit()) return;
    setState("saving");
    setServerErrors({});
    try {
      const { profile: saved } = await saveProfile(token, {
        fullName: fields.fullName,
        email: fields.email,
        phone: fields.phone || undefined,
      });
      setProfile(saved);
      setState("saved");
      // A moment to show it worked, then carry on.
      setTimeout(() => router.replace(next), 600);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400 && error.body.fields) {
        setServerErrors(error.body.fields as Partial<Fields>);
      } else {
        setServerErrors({ form: "We couldn't save your details. Check your connection and try again." });
      }
      setState("idle");
    }
  };

  return (
    <Card className="p-6 sm:p-8">
      {isNew && <Steps steps={["Connect", "Confirm it's you", "Your details"]} current={2} />}
      <div className={`animate-step-in ${isNew ? "mt-8" : ""}`}>
        <h1 className="text-2xl font-semibold tracking-tight">{isNew ? "Almost there" : "Your details"}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          We use these to reach you about your policy and claims. They stay private and never go on the
          blockchain.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <Field label="Full name" autoComplete="name" value={fields.fullName} error={errorFor("fullName")} onBlur={() => blur("fullName")} onChange={(v) => setFields({ ...fields, fullName: v })} />
          <Field label="Email" type="email" autoComplete="email" value={fields.email} error={errorFor("email")} onBlur={() => blur("email")} onChange={(v) => setFields({ ...fields, email: v })} />
          <Field
            label="Phone (optional)"
            type="tel"
            autoComplete="tel"
            placeholder="+254 712 345 678"
            value={fields.phone}
            error={errorFor("phone")}
            onBlur={() => blur("phone")}
            onChange={(v) => setFields({ ...fields, phone: v })}
          />
          {serverErrors.form && (
            <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm">
              {serverErrors.form}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={state !== "idle"}>
            {state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : isNew ? "Finish" : "Save"}
          </Button>
        </form>
      </div>
    </Card>
  );
}

function Field({
  label,
  error,
  onChange,
  ...input
}: { label: string; error?: string; onChange: (value: string) => void } & Omit<React.ComponentProps<"input">, "onChange">) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        {...input}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-2 w-full rounded-xl border bg-bg px-3 py-3 outline-none transition-colors focus:border-action ${
          error ? "border-danger" : "border-line"
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
