"use client";

// RouteChangeProvider - simplified version
// The previous implementation caused page flashing by hiding content on every route change
export function RouteChangeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
