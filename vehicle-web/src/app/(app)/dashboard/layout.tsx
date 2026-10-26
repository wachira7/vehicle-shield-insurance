import { CustomerOnly } from "@/components/customer-only";
import { DashboardNav } from "@/components/dashboard-nav";
import { RequireSession } from "@/components/require-session";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSession>
      <CustomerOnly>
        <div className="mx-auto flex w-full max-w-[90rem] gap-10 px-4 pb-28 pt-8 sm:px-6 lg:px-8 lg:pb-16">
          <DashboardNav />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </CustomerOnly>
    </RequireSession>
  );
}
