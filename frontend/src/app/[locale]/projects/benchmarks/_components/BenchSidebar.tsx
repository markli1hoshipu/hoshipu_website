"use client";

/**
 * Left sidebar for the EmbodyBench standalone app.
 *
 * Design language follows CARIN Loom's NavBar: typographic wordmark,
 * slate-on-white with indigo accent, vertical on lg+, horizontal scroller
 * on mobile. We share the same shadcn/Tailwind setup as the rest of the
 * site so no new tokens are introduced — just a tighter palette discipline
 * inside the /benchmarks subtree.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { LogOut } from "lucide-react";

import { useBenchAuth } from "@/contexts/BenchAuthProvider";

interface NavItem {
  to: string; // path relative to /[locale]/projects/benchmarks
  label: string;
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "", label: "Home" },
  { to: "new", label: "New run" },
  { to: "runs", label: "Runs" },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: "admin", label: "Workers + users", comingSoon: true },
];

const LINK_BASE =
  "flex shrink-0 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const LINK_INACTIVE = "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
const LINK_ACTIVE = "bg-indigo-500 text-white hover:bg-indigo-600";
const LINK_DISABLED = "text-slate-400 cursor-not-allowed";

export function BenchSidebar() {
  const locale = useLocale();
  const pathname = usePathname();
  const { user, logout } = useBenchAuth();
  const base = `/${locale}/projects/benchmarks`;

  const renderItem = (item: NavItem) => {
    const href = item.to ? `${base}/${item.to}` : base;
    const isActive = item.to
      ? pathname?.startsWith(href)
      : pathname === base || pathname === `${base}/`;

    if (item.comingSoon) {
      return (
        <span
          key={item.to}
          className={`${LINK_BASE} ${LINK_DISABLED}`}
          title="Coming soon"
        >
          {item.label}
          <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-400">
            soon
          </span>
        </span>
      );
    }

    return (
      <Link
        key={item.to}
        href={href}
        className={`${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="EmbodyBench navigation"
      className="flex w-full shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-3 py-3 lg:h-full lg:w-56 lg:flex-col lg:border-b-0 lg:border-r lg:py-5"
    >
      {/* Wordmark */}
      <div className="px-3 lg:mb-3">
        <p className="text-lg font-bold tracking-tight text-slate-900">
          embodybench
        </p>
        <p className="text-xs uppercase tracking-wider text-slate-400">
          benchmark platform
        </p>
      </div>

      {/* Nav items */}
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-x-visible lg:pb-0">
        {NAV_ITEMS.map(renderItem)}

        {user?.role === "admin" && (
          <>
            <div className="hidden px-3 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-400 lg:block">
              Admin
            </div>
            {ADMIN_NAV_ITEMS.map(renderItem)}
          </>
        )}
      </div>

      {/* User + logout */}
      {user && (
        <div className="border-t border-slate-200 pt-3 lg:mt-auto">
          <div className="px-3 pb-2">
            <p className="truncate text-sm font-medium text-slate-800">
              {user.display_name || user.email}
            </p>
            <p className="text-xs text-slate-500">
              {user.role === "admin" ? "Administrator" : "User"}
            </p>
          </div>
          <button
            onClick={logout}
            className={`${LINK_BASE} w-full text-slate-600 hover:bg-slate-100 hover:text-slate-900`}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
