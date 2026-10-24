"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/require-session";

// Wallet libraries render in the browser only: these pages are personal to the signed-in user,
// and the wallet SDKs' server builds pull in code (payment add-ons) we neither use nor bundle.
export const Providers = dynamic(() => import("./wallet-providers"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});
