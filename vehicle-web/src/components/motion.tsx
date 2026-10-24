"use client";

// Small, dependency-free motion: content fades in as it scrolls onto the screen and out as it
// leaves (in either direction), and numbers count up once. Both respect prefers-reduced-motion,
// and content stays visible without JavaScript (the hidden state needs the `js` class on <html>).
import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import { formatUsd } from "@/lib/format";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Shown once a fifth of the element is on screen (inside a band that trims 8% off the top and
// bottom edges), hidden again when it drops below that while scrolling away.
const VISIBLE_RATIO = 0.2;
const OBSERVER: IntersectionObserverInit = { rootMargin: "-8% 0px -8% 0px", threshold: [0, VISIBLE_RATIO] };

/// `once`: stay visible after the first appearance (used for counters).
function useInView<T extends Element>({ once = false } = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      // Tall elements may never reach the ratio, so also count them once they fill the band.
      const visible =
        entry.isIntersecting &&
        (entry.intersectionRatio >= VISIBLE_RATIO || entry.intersectionRect.height >= (entry.rootBounds?.height ?? Infinity) * 0.5);
      if (visible) {
        setInView(true);
        if (once) observer.disconnect();
      } else if (!once) {
        setInView(false);
      }
    }, OBSERVER);
    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);
  return [ref, inView] as const;
}

export function Reveal({
  as: Tag = "div",
  delay = 0,
  className = "",
  children,
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const [ref, inView] = useInView<HTMLElement>();
  return (
    <Tag
      ref={ref}
      data-shown={inView || undefined}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
      className={`reveal ${className}`}
    >
      {children}
    </Tag>
  );
}

// Named formats: a server component can't pass a function to this client component.
const FORMATS = {
  usd: (n: number) => formatUsd(Math.round(n), { whole: true }),
  integer: (n: number) => Math.round(n).toLocaleString("en-US"),
};

/// Counts from 0 to `value` when first visible.
export function CountUp({
  value,
  format: formatName,
  durationMs = 1200,
}: {
  value: number;
  format: keyof typeof FORMATS;
  durationMs?: number;
}) {
  const format = FORMATS[formatName];
  const [ref, inView] = useInView<HTMLSpanElement>({ once: true });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion() || value === 0) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, durationMs]);

  return (
    <span ref={ref} className="tabular-nums">
      {/* Screen readers get the real figure straight away. */}
      <span aria-hidden>{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
