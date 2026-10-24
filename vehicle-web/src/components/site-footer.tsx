export function SiteFooter() {
  return (
    <footer className="border-t border-line/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-ink-faint sm:flex-row sm:justify-between sm:px-6">
        <p>VehicleShield is running on the Sepolia test network. Policies and payouts use test USDC.</p>
        <p>Contracts verified on Sourcify</p>
      </div>
    </footer>
  );
}
