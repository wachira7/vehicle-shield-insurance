"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { fetchPhotoUrl } from "@/lib/api";
import { useSession } from "@/lib/session";

type Scope = "owner" | "assessor";

/// Loads an encrypted photo through the API (decrypted there for its owner or an assessor) and
/// returns an object URL, revoked on unmount. Undefined while loading; null if it failed.
export function useSecurePhoto(photoId: string | undefined, scope: Scope = "owner") {
  const { token } = useSession();
  const [url, setUrl] = useState<string | null>();
  useEffect(() => {
    if (!photoId || !token) return;
    let objectUrl: string | undefined;
    let cancelled = false;
    setUrl(undefined);
    fetchPhotoUrl(token, photoId, scope)
      .then((value) => {
        objectUrl = value;
        if (!cancelled) setUrl(value);
        else URL.revokeObjectURL(value);
      })
      .catch(() => !cancelled && setUrl(null));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId, token, scope]);
  return url;
}

export function SecurePhoto({
  id,
  alt,
  scope = "owner",
  className = "aspect-square",
  onOpen,
}: {
  id: string;
  alt: string;
  scope?: Scope;
  className?: string;
  onOpen?: () => void;
}) {
  const url = useSecurePhoto(id, scope);
  const frame = `${className} w-full overflow-hidden rounded-xl border border-line bg-surface-2`;
  if (url === undefined) return <div className={`${frame} animate-pulse`} aria-label="Loading photo" />;
  if (url === null) return <div className={`${frame} grid place-items-center text-xs text-ink-faint`}>Photo unavailable</div>;
  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- decrypted photo from an object URL
    <img src={url} alt={alt} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
  );
  return onOpen ? (
    <button type="button" onClick={onOpen} className={`${frame} group block cursor-zoom-in`} aria-label={`Enlarge: ${alt}`}>
      {image}
    </button>
  ) : (
    <div className={frame}>{image}</div>
  );
}

export interface LightboxItem {
  id: string;
  label: string;
  caption?: ReactNode;
  /// A second photo to show beside this one, e.g. the photo it duplicates.
  compareWith?: { id: string; label: string };
}

/// Full-screen viewer: arrow keys or swipe between photos, Esc to close.
export function Lightbox({
  items,
  index,
  scope = "owner",
  onIndex,
  onClose,
}: {
  items: LightboxItem[];
  index: number;
  scope?: Scope;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const item = items[index];
  const go = (delta: number) => onIndex((index + delta + items.length) % items.length);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && dialog.current?.close()}
      onTouchStart={(event) => (touchX.current = event.touches[0].clientX)}
      onTouchEnd={(event) => {
        if (touchX.current === null) return;
        const dx = event.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
      className="m-auto h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/85 backdrop:backdrop-blur-sm"
      aria-label={item.label}
    >
      <div className="animate-step-in flex h-full flex-col p-4 sm:p-8">
        <div className="flex items-center justify-between gap-4 text-white">
          <p className="text-sm font-medium">
            {item.label}
            <span className="ml-2 text-white/50">
              {index + 1} / {items.length}
            </span>
          </p>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="grid size-10 place-items-center rounded-full bg-white/10 text-xl hover:bg-white/20"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className={`mt-4 grid min-h-0 flex-1 gap-4 ${item.compareWith ? "sm:grid-cols-2" : ""}`}>
          <LargePhoto id={item.id} label={item.compareWith ? item.label : undefined} scope={scope} />
          {item.compareWith && <LargePhoto id={item.compareWith.id} label={item.compareWith.label} scope={scope} />}
        </div>
        {item.caption && <div className="mx-auto mt-4 max-w-3xl text-center text-sm text-white/80">{item.caption}</div>}
        {items.length > 1 && (
          <div className="mt-4 flex justify-center gap-3">
            <button type="button" onClick={() => go(-1)} className="rounded-full bg-white/10 px-5 py-2 text-sm text-white hover:bg-white/20">
              ← Previous
            </button>
            <button type="button" onClick={() => go(1)} className="rounded-full bg-white/10 px-5 py-2 text-sm text-white hover:bg-white/20">
              Next →
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}

function LargePhoto({ id, label, scope }: { id: string; label?: string; scope: Scope }) {
  const url = useSecurePhoto(id, scope);
  return (
    <figure className="flex min-h-0 flex-col items-center justify-center">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- decrypted photo from an object URL
        <img src={url} alt={label ?? ""} className="max-h-full min-h-0 rounded-lg object-contain" />
      ) : (
        <div className="size-full max-h-[60vh] animate-pulse rounded-lg bg-white/10" />
      )}
      {label && <figcaption className="mt-2 text-xs text-white/70">{label}</figcaption>}
    </figure>
  );
}
