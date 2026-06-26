"use client";

/**
 * Shell that wraps every page under /projects/benchmarks.
 *
 * Two display modes, chosen by URL:
 *  - /login → bare slate-50 background, centered child (no sidebar).
 *    Used by login + any future public/onboarding screen.
 *  - everything else → sidebar on the left, scrollable main on the right.
 *    BenchAuthProvider gates these and bounces unauth users to /login.
 *
 * Keeping all the chrome inside the /benchmarks subtree means the rest
 * of hoshipu.com can ignore us entirely — the site nav/footer is hidden
 * for this route prefix via ConditionalLayout.
 */

import { usePathname } from "next/navigation";

import { BenchSidebar } from "./BenchSidebar";

export function BenchShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicScreen = pathname?.endsWith("/benchmarks/login");

  if (isPublicScreen) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:h-screen lg:flex-row">
      <BenchSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
