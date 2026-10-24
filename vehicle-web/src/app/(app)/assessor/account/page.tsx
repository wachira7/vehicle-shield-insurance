import type { Metadata } from "next";
import { AccountOverview } from "../../dashboard/account/account-overview";

export const metadata: Metadata = { title: "Account" };

export default function StaffAccountPage() {
  return <AccountOverview staff />;
}
