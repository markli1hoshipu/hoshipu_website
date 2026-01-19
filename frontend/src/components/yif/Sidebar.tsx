"use client";

import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useYIFAuth } from "@/hooks/useYIFAuth";
import {
  Home,
  BarChart3,
  FileText,
  Search,
  DollarSign,
  ListOrdered,
  CheckSquare,
  LogOut,
  Menu,
  X,
  Database,
  Users,
  UserSearch,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[]; // If undefined, visible to all
  disabled?: boolean; // If true, item is visible but not clickable
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const getNavGroups = (locale: string): NavGroup[] => [
  {
    title: "",
    items: [
      { title: "首页", href: `/${locale}/projects/yif`, icon: Home },
    ],
  },
  {
    title: "欠条管理",
    items: [
      { title: "欠条录入", href: `/${locale}/projects/yif/ious`, icon: FileText },
      { title: "欠条查询与导出", href: `/${locale}/projects/yif/ious/search`, icon: Search },
    ],
  },
  {
    title: "付款管理",
    items: [
      { title: "付款录入", href: `/${locale}/projects/yif/payments`, icon: DollarSign },
      { title: "付款查询与导出", href: `/${locale}/projects/yif/payments/search`, icon: Search },
      { title: "多笔付款录入", href: `/${locale}/projects/yif/payments/batch`, icon: ListOrdered, disabled: true },
      { title: "自选付款录入", href: `/${locale}/projects/yif/payments/select`, icon: CheckSquare },
    ],
  },
  {
    title: "数据管理",
    items: [
      { title: "团队数据查询", href: `/${locale}/projects/yif/team-data`, icon: UserSearch, roles: ['admin', 'manager'] },
      { title: "外部数据查询", href: `/${locale}/projects/yif/data`, icon: Upload, roles: ['admin'] },
    ],
  },
  {
    title: "系统管理",
    items: [
      { title: "团队管理", href: `/${locale}/projects/yif/team`, icon: Users, roles: ['admin'] },
      { title: "数据迁移", href: `/${locale}/projects/yif/migration`, icon: Database, roles: ['admin'] },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const locale = useLocale();
  const { user, logout } = useYIFAuth();
  const navGroups = getNavGroups(locale);
  const userRole = user?.role || 'user';

  const isActive = (href: string) => {
    // Exact match for home page
    if (href === `/${locale}/projects/yif`) {
      return pathname === href;
    }
    // Prefix match for other pages
    return pathname?.startsWith(href);
  };

  // Check if user has access to a nav item
  const hasAccess = (item: NavItem) => {
    if (!item.roles) return true; // No roles = visible to all
    return item.roles.includes(userRole);
  };

  // Filter groups to only show items user has access to
  const filteredGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(hasAccess)
    }))
    .filter(group => group.items.length > 0); // Hide empty groups

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">YIF 付款管理系统</h1>
        {user && (
          <p className="text-sm text-slate-400 mt-1">欢迎，{user.username} ({userRole})</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 dark-scrollbar">
        {filteredGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6">
            {group.title && (
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 px-3">
                {group.title}
              </h2>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                if (item.disabled) {
                  return (
                    <li key={item.href}>
                      <span className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 cursor-not-allowed">
                        <Icon className="h-5 w-5" />
                        {item.title}
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        active
                          ? "bg-slate-800 text-white font-medium"
                          : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={() => {
            logout();
            onNavigate?.();
          }}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          退出登录
        </button>
      </div>
    </div>
  );
}

// Desktop Sidebar
export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 flex-shrink-0">
      <div className="fixed w-64 h-screen">
        <SidebarContent />
      </div>
    </aside>
  );
}

// Mobile Sidebar with Sheet
export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden fixed top-4 left-4 z-50 bg-slate-900 text-white hover:bg-slate-800"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64 border-0">
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

// Combined export for layout
export function YIFSidebar() {
  return (
    <>
      <Sidebar />
      <MobileSidebar />
    </>
  );
}
