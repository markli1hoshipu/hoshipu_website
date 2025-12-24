"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";

interface User {
  id: number;
  username: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  logout: () => void;
  getToken: () => string | null;
}

const YIFAuthContext = createContext<AuthContextType | null>(null);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6101';

export function YIFAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  // Verify auth only once
  useEffect(() => {
    if (verified) return;

    const verifyAuth = async () => {
      const token = localStorage.getItem('yif_access_token');

      if (!token || token.trim() === '') {
        setUser(null);
        setLoading(false);
        setVerified(true);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/yif/verify`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          localStorage.removeItem('yif_access_token');
          setUser(null);
        }
      } catch {
        setError("Auth failed");
        setUser(null);
      }

      setLoading(false);
      setVerified(true);
    };

    verifyAuth();
  }, [verified]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      const isLoginPage = pathname?.includes('/login');
      if (!isLoginPage) {
        router.push(`/${locale}/projects/yif/login?redirect=${encodeURIComponent(pathname || '')}`);
      }
    }
  }, [loading, user, router, locale, pathname]);

  const logout = () => {
    localStorage.removeItem('yif_access_token');
    localStorage.removeItem('yif_user');
    setUser(null);
    setVerified(false);
    router.push(`/${locale}/projects`);
  };

  const getToken = () => {
    return localStorage.getItem('yif_access_token');
  };

  return (
    <YIFAuthContext.Provider value={{ user, loading, error, logout, getToken }}>
      {children}
    </YIFAuthContext.Provider>
  );
}

export function useYIFAuth() {
  const context = useContext(YIFAuthContext);
  if (!context) {
    throw new Error("useYIFAuth must be used within YIFAuthProvider");
  }
  return context;
}
