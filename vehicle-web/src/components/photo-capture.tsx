"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, PHOTO_VIEWS, uploadVehiclePhoto, type PhotoView, type Vehicle } from "@/lib/api";
import { prepareImage, readCaptureMetadata } from "@/lib/images";
import { VIEW_GUIDE } from "@/lib/photo-views";
import { useSession } from "@/lib/session";
import { useSecurePhoto } from "./secure-photo";
import { useToast } from "./toast";

type TileState =
  | { kind: "empty" }
  | { kind: "stored"; photoId: string }
  | { kind: "uploading"; preview: string; progress: number }
  | { kind: "done"; preview: string }
  | { kind: "failed"; preview: string; file: File; message: string };

/// The six required photos, each a tile that opens the camera on phones and uploads with progress.
export function PhotoCapture({ vehicle, onChange }: { vehicle: Vehicle; onChange?: (vehicle: Vehicle) => void }) {
  const [tiles, setTiles] = useState<Record<PhotoView, TileState>>(() =>
    Object.fromEntries(
      PHOTO_VIEWS.map((view) => {
        const stored = vehicle.photos.find((photo) => photo.view === view);
        return [view, stored ? { kind: "stored", photoId: stored.id } : { kind: "empty" }];
      }),
    ) as Record<PhotoView, TileState>,
  );
  const { token } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const editable = vehicle.status === "pending";
  const doneCount = PHOTO_VIEWS.filter((view) => ["stored", "done"].includes(tiles[view].kind)).length;

  const upload = async (view: PhotoView, file: File) => {
    const preview = URL.createObjectURL(file);
    setTiles((all) => ({ ...all, [view]: { kind: "uploading", preview, progress: 0 } }));
    try {
      const [prepared, meta] = await Promise.all([prepareImage(file), readCaptureMetadata(file)]);
      const result = await uploadVehiclePhoto(
        token!,
        vehicle.id,
        view,
        prepared,
        (progress) => setTiles((all) => ({ ...all, [view]: { kind: "uploading", preview, progress } })),
        meta,
      );
      setTiles((all) => ({ ...all, [view]: { kind: "done", preview } }));
      onChange?.(result.vehicle);
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast(`${VIEW_GUIDE[view].label} photo added`);
    } catch (error) {
      const message =
        error instanceof ApiError && typeof error.body.reason === "string"
          ? error.body.reason
          : error instanceof ApiError && error.status === 0
            ? "No connection. Check your signal and retry."
            : "Upload failed. Retry.";
      setTiles((all) => ({ ...all, [view]: { kind: "failed", preview, file, message } }));
      toast(`${VIEW_GUIDE[view].label}: ${message}`, "error");
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="text-ink-muted">
          {doneCount} of {PHOTO_VIEWS.length} photos
        </span>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full rounded-full bg-action transition-[width] duration-500" style={{ width: `${(doneCount / 6) * 100}%` }} />
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PHOTO_VIEWS.map((view) => (
          <li key={view}>
            <PhotoTile view={view} state={tiles[view]} editable={editable} onFile={(file) => upload(view, file)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhotoTile({
  view,
  state,
  editable,
  onFile,
}: {
  view: PhotoView;
  state: TileState;
  editable: boolean;
  onFile: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const storedUrl = useSecurePhoto(state.kind === "stored" ? state.photoId : undefined) ?? undefined;
  const image = state.kind === "stored" ? storedUrl : state.kind === "empty" ? undefined : state.preview;
  const guide = VIEW_GUIDE[view];
  const busy = state.kind === "uploading";

  return (
    <div className="group">
      <button
        type="button"
        disabled={!editable || busy}
        onClick={() => (state.kind === "failed" ? onFile(state.file) : input.current?.click())}
        aria-label={`${guide.label}: ${state.kind === "empty" ? "add photo" : state.kind === "failed" ? "retry upload" : "replace photo"}`}
        className={`relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-2xl border text-left transition-colors ${
          state.kind === "failed" ? "border-danger/60" : state.kind === "empty" ? "border-dashed border-line hover:border-action" : "border-line"
        } ${editable && !busy ? "cursor-pointer" : "cursor-default"} bg-bg`}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URLs, not optimisable
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : state.kind === "stored" ? (
          <span className="absolute inset-0 animate-pulse bg-surface" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-ink-faint">
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            <span className="text-xs">Tap to add</span>
          </span>
        )}

        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-bg/60">
            <ProgressRing value={state.progress} />
          </span>
        )}
        {(state.kind === "done" || state.kind === "stored") && (
          <span className="animate-step-in absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-action text-xs font-bold text-action-ink">
            ✓
          </span>
        )}
        {state.kind === "failed" && (
          <span className="absolute inset-x-0 bottom-0 bg-danger/90 px-2 py-1.5 text-center text-xs font-medium text-white">Tap to retry</span>
        )}
      </button>
      <p className="mt-2 text-sm font-medium">{guide.label}</p>
      <p className="text-xs text-ink-faint">{state.kind === "failed" ? state.message : guide.hint}</p>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 18;
  return (
    <svg viewBox="0 0 44 44" className="size-12 -rotate-90" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4" className="text-line" />
      <circle
        cx="22"
        cy="22"
        r="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="text-action transition-[stroke-dashoffset] duration-200"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value)}
      />
    </svg>
  );
}
