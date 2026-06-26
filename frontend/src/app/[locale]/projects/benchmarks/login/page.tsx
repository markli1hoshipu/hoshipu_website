"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Mail } from "lucide-react";
import { login, BenchApiError } from "@/lib/benchApi";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("benchmarks.login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Same redirect safety check as YIF login.
  const rawRedirect = searchParams.get("redirect");
  const isValidRedirect = (url: string | null): boolean =>
    !!url && url.startsWith("/") && !url.includes("://") && !url.startsWith("//");
  const redirectPath = isValidRedirect(rawRedirect)
    ? rawRedirect!
    : `/${locale}/projects/benchmarks`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      // Full-page navigation so auth context re-initializes from localStorage.
      window.location.href = redirectPath;
    } catch (err) {
      if (err instanceof BenchApiError) {
        setError(err.status === 429 ? t("rateLimited") : err.message);
      } else {
        setError(t("connError"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-md"
    >
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">{t("title")}</CardTitle>
          <CardDescription className="text-center">{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("emailLabel")}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("passwordLabel")}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("loggingIn") : t("submit")}
            </Button>

            <p className="text-xs text-muted-foreground text-center pt-2">
              {t("inviteOnly")}
            </p>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LoginFallback() {
  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">EmbodyBench</CardTitle>
          <CardDescription className="text-center">Loading…</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function BenchmarksLogin() {
  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[80vh]">
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
