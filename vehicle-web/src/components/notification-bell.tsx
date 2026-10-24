"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markNotificationsRead } from "@/lib/api";
import { timeAgo } from "@/lib/queue";
import { useSession } from "@/lib/session";

/// The header's bell: unread count, and the latest notifications in a panel. Opening the panel
/// marks them read.
export function NotificationBell() {
  const { token, address } = useSession();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const key = ["notifications", address];
  const list = useQuery({ queryKey: key, queryFn: () => listNotifications(token!), enabled: Boolean(token), refetchInterval: 30_000 });
  const unread = list.data?.unread ?? 0;

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  // Opening the panel marks everything read; the dots stay visible until it closes.
  useEffect(() => {
    if (!open || !unread || !token) return;
    markNotificationsRead(token)
      .then(() => queryClient.setQueryData(key, (data: typeof list.data) => (data ? { ...data, unread: 0 } : data)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per opening
  }, [open]);

  if (!token) return null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) void list.refetch();
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink-muted hover:bg-surface-2 hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 9a6 6 0 1112 0c0 5 2 6.5 2 6.5H4S6 14 6 9" />
          <path d="M10 19a2 2 0 004 0" />
        </svg>
        {unread > 0 && (
          <span className="animate-step-in absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-action px-1 text-[11px] font-bold tabular-nums text-action-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <div
        className={`absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] origin-top-right rounded-2xl border border-line bg-surface shadow-2xl shadow-black/40 transition duration-150 ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <p className="border-b border-line px-4 py-3 text-sm font-semibold">Notifications</p>
        {list.isPending ? (
          <div className="m-3 h-24 animate-pulse rounded-xl bg-surface-2" />
        ) : !list.data?.notifications.length ? (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">Nothing yet. Updates appear here as they happen.</p>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {list.data.notifications.map((item) => {
              const content = (
                <div className="flex gap-3 px-4 py-3">
                  <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${item.readAt ? "bg-transparent" : "bg-action"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{item.body}</p>
                    <p className="mt-1 text-[11px] text-ink-faint">{timeAgo(Date.now() - new Date(item.createdAt).getTime())}</p>
                  </div>
                </div>
              );
              return (
                <li key={item.id}>
                  {item.link ? (
                    <Link href={item.link} className="block hover:bg-surface-2">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
