"use client";

// Form errors that don't nag: a field's error shows once the person has left that field, or
// after they try to submit, and disappears as soon as it's fixed.
import { useCallback, useState } from "react";

export function visibleError<K extends string>(errors: Partial<Record<K, string>>, key: K, blurred: ReadonlySet<K>, submitted: boolean) {
  return submitted || blurred.has(key) ? errors[key] : undefined;
}

export function useFieldErrors<K extends string>(errors: Partial<Record<K, string>>) {
  const [blurred, setBlurred] = useState<ReadonlySet<K>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const blur = useCallback((key: K) => setBlurred((current) => (current.has(key) ? current : new Set(current).add(key))), []);

  /// Call on submit: reveals every error and, if there are any, moves focus to the first one.
  const attemptSubmit = () => {
    setSubmitted(true);
    const valid = !Object.values(errors).some(Boolean);
    if (!valid) requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
    return valid;
  };

  return { shown: (key: K) => visibleError(errors, key, blurred, submitted), blur, attemptSubmit, submitted };
}
