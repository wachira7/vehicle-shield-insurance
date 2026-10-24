import { AppHeader } from "@/components/app-header";
import { Providers } from "./providers";

// Signed-in parts of the app: wallet, session and account UI load only here.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AppHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
    </Providers>
  );
}
