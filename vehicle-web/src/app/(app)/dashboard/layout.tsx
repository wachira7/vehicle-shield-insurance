import { DashboardNav } from "@/components/dashboard-nav";
import { RequireSession } from "@/components/require-session";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSession>
      <div className="mx-auto flex w-full max-w-6xl gap-10 px-4 pb-28 pt-8 sm:px-6 lg:pb-16">
        <DashboardNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </RequireSession>
  );
}
