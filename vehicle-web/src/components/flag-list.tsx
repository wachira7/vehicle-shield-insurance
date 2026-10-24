import type { FlagText, Tone } from "@/lib/flags";

const toneStyles: Record<Tone, string> = {
  danger: "border-danger/30 bg-danger/10 text-danger",
  warn: "border-warn/30 bg-warn/10 text-warn",
  info: "border-line bg-surface-2 text-ink-muted",
};
const toneIcon: Record<Tone, string> = { danger: "!", warn: "?", info: "i" };

/// Warning signs as compact rows: what was found, then what it means.
export function FlagList({ flags, compact = false }: { flags: FlagText[]; compact?: boolean }) {
  if (!flags.length) return null;
  return (
    <ul className="space-y-1.5">
      {flags.map((flag) => (
        <li key={flag.title + flag.detail} className={`flex gap-2 rounded-lg border ${compact ? "px-2 py-1.5 text-xs" : "p-3 text-sm"} ${toneStyles[flag.tone]}`}>
          <span aria-hidden className="mt-px grid size-4 shrink-0 place-items-center rounded-full bg-current text-[10px] font-bold">
            <span className="text-bg">{toneIcon[flag.tone]}</span>
          </span>
          <span>
            <span className="font-semibold">{flag.title}.</span> <span className="text-ink-muted">{flag.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
