"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlagList } from "@/components/flag-list";
import { Lightbox, SecurePhoto, type LightboxItem } from "@/components/secure-photo";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/toast";
import { Button, Card } from "@/components/ui";
import { ApiError, getVehicleForReview, rejectVehicle, verifyVehicle, type AssessorVehicle, type VehicleCorrections } from "@/lib/api";
import { collapseMissingMetadata, describeFlag, describeMatch } from "@/lib/flags";
import { formatUsd } from "@/lib/format";
import { VIEW_GUIDE } from "@/lib/photo-views";
import { useSession } from "@/lib/session";

type Fields = Required<Omit<VehicleCorrections, "note">>;

const FIELDS: { key: keyof Fields; label: string; hint?: string }[] = [
  { key: "year", label: "Year" },
  { key: "marketValueUsdc", label: "Market value (USD)" },
  { key: "mileageKm", label: "Mileage (km)", hint: "Check against the odometer photo" },
  { key: "condition", label: "Condition (1–10)" },
  { key: "accidentsLast3Years", label: "Accidents, last 3 years" },
];

const fieldsOf = (vehicle: AssessorVehicle): Fields => ({
  year: vehicle.year,
  marketValueUsdc: Number(vehicle.marketValueUsdc),
  mileageKm: vehicle.mileageKm,
  condition: vehicle.condition,
  accidentsLast3Years: vehicle.accidentsLast3Years,
  usage: vehicle.usage,
});

export default function VehicleReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useSession();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const vehicle = useQuery({ queryKey: ["assessor", "vehicle", id], queryFn: () => getVehicleForReview(token!, id), enabled: Boolean(token) });
  const [fields, setFields] = useState<Fields>();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"verify" | "reject" | null>(null);
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (vehicle.data && !fields) setFields(fieldsOf(vehicle.data));
  }, [vehicle.data, fields]);

  if (vehicle.isPending || (vehicle.data && !fields)) return <div className="h-96 animate-pulse rounded-2xl bg-surface" />;
  if (!vehicle.data || !fields) {
    return (
      <Card className="py-12 text-center">
        <p className="font-semibold">This vehicle wasn&apos;t found</p>
        <Link href="/dashboard/assessor" className="mt-3 inline-block text-sm text-action hover:underline">
          Back to the queue
        </Link>
      </Card>
    );
  }

  const v = vehicle.data;
  const original = fieldsOf(v);
  const { photos: checked, allMissing } = collapseMissingMetadata(
    v.photos.map((photo) => ({ id: photo.id, flags: v.checks?.[photo.id]?.flags ?? [] })),
  );
  const flagsOf = new Map(checked.map((photo) => [photo.id, photo.flags]));
  const changed = (Object.keys(fields) as (keyof Fields)[]).filter((key) => fields[key] !== original[key]);
  const pending = v.status === "pending";
  const complete = v.missingViews.length === 0;
  const items: LightboxItem[] = v.photos.map((photo) => {
    const duplicate = v.checks?.[photo.id]?.flags.find((flag) => flag.kind === "duplicate");
    return {
      id: photo.id,
      label: VIEW_GUIDE[photo.view]?.label ?? photo.view,
      caption: VIEW_GUIDE[photo.view]?.hint,
      compareWith: duplicate?.kind === "duplicate" ? { id: duplicate.photoId, label: `Matches ${describeMatch(duplicate.match)}` } : undefined,
    };
  });

  const act = async (action: "verify" | "reject") => {
    setBusy(action);
    setError(undefined);
    try {
      if (action === "verify") {
        const corrections: VehicleCorrections = Object.fromEntries(changed.map((key) => [key, fields[key]]));
        await verifyVehicle(token!, v.id, { ...corrections, ...(note.trim() && { note: note.trim() }) });
        toast(`${v.plate} verified${changed.length ? ` with ${changed.length} correction${changed.length > 1 ? "s" : ""}` : ""}`);
      } else {
        await rejectVehicle(token!, v.id, note.trim());
        toast(`${v.plate} sent back to the owner`);
      }
      await queryClient.invalidateQueries({ queryKey: ["assessor"] });
      router.push("/dashboard/assessor");
    } catch (err) {
      const body = err instanceof ApiError ? err.body : {};
      setError(
        body.error === "verified_for_another_owner"
          ? "This plate is already verified for another owner. Reject that record first if the car was sold."
          : body.error === "missing_photos"
            ? "All six photos are needed before verifying."
            : body.error === "not_pending"
              ? "Another assessor already decided this vehicle."
              : "That didn't go through. Please try again.",
      );
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/dashboard/assessor" className="text-sm text-ink-muted hover:text-ink">
        ← Queue
      </Link>
      <header className="animate-step-in flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="font-mono">{v.plate}</span>
          </h1>
          <p className="mt-1 text-ink-muted">
            {v.make} {v.model} · submitted {new Date(v.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} by{" "}
            <span className="font-mono text-xs">{v.owner}</span>
          </p>
        </div>
        <StatusBadge status={v.status} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="photos-heading" className="min-w-0">
          <h2 id="photos-heading" className="mb-3 font-semibold">
            Photos <span className="font-normal text-ink-faint">({v.photos.length}/6)</span>
          </h2>
          {allMissing && (
            <p className="mb-3 text-sm text-ink-muted">
              None of these photos carries a date, place or camera. Common for screenshots and chat-app photos; ask for originals if anything looks off.
            </p>
          )}
          <ul className="grid gap-4 sm:grid-cols-2">
            {v.photos.map((photo, index) => {
              const check = v.checks?.[photo.id];
              return (
                <li key={photo.id} className="space-y-2">
                  <SecurePhoto id={photo.id} scope="assessor" alt={items[index].label} className="aspect-[4/3]" onOpen={() => setOpen(index)} />
                  <div>
                    <p className="text-sm font-medium">{items[index].label}</p>
                    <p className="text-xs text-ink-faint">
                      {check?.capturedAt ? `Taken ${new Date(check.capturedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}` : VIEW_GUIDE[photo.view]?.hint}
                      {check?.camera && ` · ${check.camera}`}
                    </p>
                  </div>
                  <FlagList compact flags={(flagsOf.get(photo.id) ?? []).map((flag) => describeFlag(flag, "vehicle"))} />
                </li>
              );
            })}
          </ul>
          {!complete && (
            <p className="mt-4 text-sm text-ink-muted">
              Still missing: {v.missingViews.map((view) => VIEW_GUIDE[view].label.toLowerCase()).join(", ")}.
            </p>
          )}
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-4">
            <div>
              <h2 className="font-semibold">Confirm the details</h2>
              <p className="mt-1 text-xs text-ink-muted">Correct anything the photos contradict. Cover is priced from what you confirm.</p>
            </div>
            {FIELDS.map(({ key, label, hint }) => (
              <div key={key}>
                <label htmlFor={key} className="flex justify-between text-sm">
                  <span>{label}</span>
                  {fields[key] !== original[key] && <span className="text-xs text-warn">was {key === "marketValueUsdc" ? formatUsd(original[key], { whole: true }) : String(original[key])}</span>}
                </label>
                <input
                  id={key}
                  inputMode="numeric"
                  disabled={!pending || busy !== null}
                  value={String(fields[key])}
                  onChange={(e) => setFields({ ...fields, [key]: Number(e.target.value.replace(/[^\d]/g, "").slice(0, 9)) })}
                  className={`mt-1 w-full rounded-xl border bg-bg px-3 py-2.5 tabular-nums outline-none focus:border-action ${fields[key] !== original[key] ? "border-warn/60" : "border-line"}`}
                />
                {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
              </div>
            ))}
            <div>
              <p className="text-sm">Usage</p>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {(["private", "commercial"] as const).map((usage) => (
                  <button
                    key={usage}
                    type="button"
                    disabled={!pending || busy !== null}
                    onClick={() => setFields({ ...fields, usage })}
                    aria-pressed={fields.usage === usage}
                    className={`rounded-xl border px-3 py-2 text-sm capitalize ${fields.usage === usage ? "border-action bg-action/10" : "border-line"}`}
                  >
                    {usage}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="note" className="text-sm">
                Note to the owner {pending && <span className="text-ink-faint">(required to send back)</span>}
              </label>
              <textarea
                id="note"
                rows={3}
                maxLength={1000}
                value={pending ? note : (v.reviewNote ?? "")}
                disabled={!pending || busy !== null}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Mileage corrected from the odometer photo."
                className="mt-1 w-full resize-none rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-action"
              />
            </div>
            {error && (
              <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm">
                {error}
              </p>
            )}
            {pending ? (
              <div className="space-y-2">
                <Button className="w-full" disabled={!complete || busy !== null} onClick={() => act("verify")}>
                  {busy === "verify" ? "Verifying…" : changed.length ? `Verify with ${changed.length} correction${changed.length > 1 ? "s" : ""}` : "Verify"}
                </Button>
                <Button variant="secondary" className="w-full" disabled={note.trim().length < 3 || busy !== null} onClick={() => act("reject")}>
                  {busy === "reject" ? "Sending back…" : "Send back to the owner"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">This vehicle is {v.status}. Nothing to decide.</p>
            )}
          </Card>
        </aside>
      </div>

      {open !== null && <Lightbox items={items} index={open} scope="assessor" onIndex={setOpen} onClose={() => setOpen(null)} />}
    </div>
  );
}
