// Money and factor formatting. USDC tracks the US dollar, so amounts are shown as dollars;
// on-chain values arrive as base units (6 decimals) in decimal strings.

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/// "536.09" -> "$536.09"
export function formatUsd(decimal: string | number, { whole = false } = {}): string {
  const value = typeof decimal === "number" ? decimal : Number(decimal);
  return (whole ? usdWhole : usd).format(value);
}

/// USDC base units ("536090000") -> "$536.09"
export function formatUsdcUnits(units: string | bigint, options?: { whole?: boolean }): string {
  const value = BigInt(units);
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, "0");
  return formatUsd(`${whole}.${fraction}`, options);
}

/// Spread over 12 months, rounded up to the cent so the monthly figure never understates.
export function perMonth(annualDecimal: string): string {
  const cents = Math.ceil((Number(annualDecimal) * 100) / 12);
  return formatUsd(cents / 100);
}

/// 1.1 -> "+10%", 0.95 -> "−5%", 1 -> "No change"
export function describeMultiplier(multiplier: number): string {
  const percent = Math.round((multiplier - 1) * 1000) / 10;
  if (percent === 0) return "No change";
  return `${percent > 0 ? "+" : "−"}${Math.abs(percent)}%`;
}
