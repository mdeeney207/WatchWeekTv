import React from "react";
import SiteFooter from "@/components/SiteFooter";

export default function PageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#05070A] text-white">
      {/* 🌌 Global Background System */}
      <div className="pointer-events-none absolute inset-0">
        {/* Top glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.10),transparent_28%)]" />

        {/* Secondary cool tone */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(59,130,246,0.08),transparent_24%)]" />

        {/* Bottom ambient fade */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.03),transparent_32%)]" />

        {/* Global vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
      </div>

      {/* 🧱 Layout Structure */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <SiteFooter />
      </div>
    </div>
  );
}