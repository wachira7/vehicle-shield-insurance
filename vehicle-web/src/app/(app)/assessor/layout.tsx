import { RequireAssessor } from "@/components/require-assessor";
import { RequireSession } from "@/components/require-session";
import { StaffNav } from "@/components/staff-nav";

// The staff workspace: assessors only, with its own navigation and no customer features.
export default function AssessorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSession>
      <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 sm:px-6 lg:pb-16">
        <RequireAssessor>
          <div className="flex gap-10">
            <StaffNav />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </RequireAssessor>
      </div>
    </RequireSession>
  );
}
