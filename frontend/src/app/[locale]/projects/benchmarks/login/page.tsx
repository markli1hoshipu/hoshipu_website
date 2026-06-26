"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Lock, Mail } from "lucide-react";

import { login, BenchApiError } from "@/lib/benchApi";

function LoginForm() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("benchmarks.login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Only allow same-app redirects (under /benchmarks). Anything else falls
  // back to the bench landing so users can't be bounced out of the app.
  const rawRedirect = searchParams.get("redirect");
  const isValidRedirect = (url: string | null): boolean =>
    !!url &&
    url.startsWith(`/${locale}/projects/benchmarks`) &&
    !url.includes("://") &&
    !url.startsWith("//");
  const redirectPath = isValidRedirect(rawRedirect)
    ? rawRedirect!
    : `/${locale}/projects/benchmarks`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password, remember);
      // Full-page nav so BenchAuthProvider re-reads localStorage on mount.
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
    <div className="w-full max-w-md">
      {/* Wordmark */}
      <div className="mb-8 text-center">
        <p className="text-3xl font-bold tracking-tight text-slate-900">
          embodybench
        </p>
        <p className="mt-1 text-sm uppercase tracking-wider text-slate-400">
          benchmark platform
        </p>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="bench-email"
              className="block text-xs font-medium text-slate-700"
            >
              {t("emailLabel")}
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="bench-email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="bench-password"
              className="block text-xs font-medium text-slate-700"
            >
              {t("passwordLabel")}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="bench-password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500/40"
            />
            <span>{t("rememberDevice")}</span>
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t("loggingIn") : t("submit")}
          </button>

          <p className="pt-1 text-center text-xs text-slate-500">
            {t("inviteOnly")}
          </p>
        </form>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  );
}

export default function BenchmarksLogin() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
