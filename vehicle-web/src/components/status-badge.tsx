const styles = {
  pending: "bg-warn/10 text-warn",
  verified: "bg-action/15 text-action",
  rejected: "bg-danger/10 text-danger",
  active: "bg-action/15 text-action",
  upcoming: "bg-surface-2 text-ink-muted",
  expired: "bg-surface-2 text-ink-faint",
  cancelled: "bg-surface-2 text-ink-faint",
} as const;

const labels: Record<keyof typeof styles, string> = {
  pending: "Under review",
  verified: "Verified",
  rejected: "Needs changes",
  active: "Active",
  upcoming: "Starts soon",
  expired: "Expired",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: keyof typeof styles }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}
