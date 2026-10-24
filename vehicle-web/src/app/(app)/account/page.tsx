import type { Metadata } from "next";
import { RequireSession } from "@/components/require-session";
import { AccountOverview } from "./account-overview";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <RequireSession>
      <AccountOverview />
    </RequireSession>
  );
}
