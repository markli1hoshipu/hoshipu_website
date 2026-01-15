"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "./Navigation";
import { Footer } from "./Footer";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isYIFRoute = pathname?.includes("/projects/yif");

  if (isYIFRoute) {
    // YIF standalone app - no navigation or footer
    return <main className="min-h-screen">{children}</main>;
  }

  // Regular pages with navigation and sticky footer
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 pt-16 pb-16">{children}</main>
      <Footer />
    </div>
  );
}
