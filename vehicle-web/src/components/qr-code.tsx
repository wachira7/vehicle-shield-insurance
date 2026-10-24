"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/// A QR code for `value`, drawn as SVG (dark on white, so any phone camera reads it).
export function QrCode({ value, label, className = "size-48" }: { value: string; label: string; className?: string }) {
  const [svg, setSvg] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b1020", light: "#ffffff" } })
      .then((markup) => !cancelled && setSvg(markup))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [value]);
  return svg ? (
    <div role="img" aria-label={label} className={`${className} overflow-hidden rounded-xl bg-white p-2 [&>svg]:size-full`} dangerouslySetInnerHTML={{ __html: svg }} />
  ) : (
    <div className={`${className} animate-pulse rounded-xl bg-surface-2`} aria-label="Drawing QR code" />
  );
}
