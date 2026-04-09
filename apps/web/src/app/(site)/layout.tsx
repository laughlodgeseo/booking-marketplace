import type { ReactNode } from "react";
import FloatingHeader from "@/components/site/FloatingHeader";
import Footer from "@/components/site/Footer";
import PreloaderGate from "@/components/tourm/PreloaderGate";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell min-h-screen bg-[var(--site-bg)]">
      <PreloaderGate />
      {/* anchor for footer "Back to top" */}
      <div id="top" />
      <FloatingHeader />
      {/* kill ANY accidental horizontal overflow */}
      <main className="min-h-screen overflow-x-clip bg-transparent pt-14 lg:pt-[80px]">{children}</main>
      <Footer />
    </div>
  );
}
