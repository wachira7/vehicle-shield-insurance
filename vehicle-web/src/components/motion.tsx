"use client";

// Small, dependency-free motion: content fades up as it scrolls into view, and numbers count
// up once. Both respect prefers-reduced-motion, and content stays visible without JavaScript
// (the hidden starting state only applies once the `js` class is on <html>).
import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { formatUsd } from "@/lib/format";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Trigger slightly before an element is fully in view; shared so the effect runs once.
const IN_VIEW: IntersectionObserverInit = { rootMargin: "0px 0px -10% 0px" };

function useInView<T extends Element>(options: IntersectionObserverInit = IN_VIEW) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, options);
    observer.observe(node);
    return () => observer.disconnect();
  }, [options]);
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
      style={{ transitionDelay: `${delay}ms` }}
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
  const [ref, inView] = useInView<HTMLSpanElement>();
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
