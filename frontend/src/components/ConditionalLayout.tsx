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

  // Regular pages with navigation and footer
  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-16">{children}</main>
      <Footer />
    </>
  );
}
