"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { BenchUser, getMe, logout as apiLogout, getToken } from "@/lib/benchApi";

interface BenchAuthContextType {
  user: BenchUser | null;
  loading: boolean;
  error: string | null;
  logout: () => void;
}

const BenchAuthContext = createContext<BenchAuthContextType | null>(null);

export function BenchAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [user, setUser] = useState<BenchUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  // Verify token on mount (once).
  useEffect(() => {
    if (verified) return;
    const verifyAuth = async () => {
      const token = getToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        setVerified(true);
        return;
      }
      try {
        const me = await getMe();
        setUser(me);
      } catch {
        setError("auth failed");
        setUser(null);
      }
      setLoading(false);
      setVerified(true);
    };
    verifyAuth();
  }, [verified]);

  // Redirect to login if not authenticated and we're not already on /login.
  useEffect(() => {
    if (loading || user) return;
    const onLogin = pathname?.endsWith("/benchmarks/login");
    if (!onLogin) {
      const back = encodeURIComponent(pathname || "");
      router.push(`/${locale}/projects/benchmarks/login?redirect=${back}`);
    }
  }, [loading, user, router, locale, pathname]);

  const logout = () => {
    apiLogout();
    setUser(null);
    setVerified(false);
    router.push(`/${locale}/projects/benchmarks/login`);
  };

  return (
    <BenchAuthContext.Provider value={{ user, loading, error, logout }}>
      {children}
    </BenchAuthContext.Provider>
  );
}

export function useBenchAuth(): BenchAuthContextType {
  const ctx = useContext(BenchAuthContext);
  if (!ctx) throw new Error("useBenchAuth must be used inside BenchAuthProvider");
  return ctx;
}
