"use client";

/**
 * YIF Payment Management System Layout
 * This layout provides the sidebar navigation for the YIF system
 * Login page is excluded from sidebar
 */

import { usePathname } from "next/navigation";
import { YIFSidebar } from "@/components/yif/Sidebar";
import { YIFAuthProvider } from "@/contexts/YIFAuthContext";

function YIFLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname?.includes("/login");

  // Login page: no sidebar
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-50">
        {children}
      </div>
    );
  }

  // Other pages: with sidebar
  return (
    <div className="flex min-h-screen bg-slate-50">
      <YIFSidebar />
      <main className="flex-1 lg:ml-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}

export default function YIFLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <YIFAuthProvider>
      <YIFLayoutContent>{children}</YIFLayoutContent>
    </YIFAuthProvider>
  );
}
