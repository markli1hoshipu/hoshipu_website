"use client";

import { useTranslations } from "next-intl";
import { Beaker, ArrowRight } from "lucide-react";

import { useBenchAuth } from "@/contexts/BenchAuthProvider";

export default function BenchmarksLanding() {
  const t = useTranslations("benchmarks.landing");
  const { user, loading } = useBenchAuth();

  // BenchAuthProvider redirects unauth → /login; while it's working, show
  // a neutral placeholder rather than the empty shell.
  if (loading || !user) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Beaker className="h-6 w-6 text-indigo-500" />
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      </header>

      {/* Empty state card */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">
            {t("noRunsTitle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{t("noRunsDesc")}</p>
        </div>
        <div className="px-5 py-5">
          <button
            disabled
            title={t("newRunComingSoon")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white opacity-60 disabled:cursor-not-allowed"
          >
            {t("newRun")}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-3 text-xs text-slate-500">{t("phaseNote")}</p>
        </div>
      </section>

      {/* Sample "what's available" preview card to give the page some weight */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
              <Beaker className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold text-slate-800">RoboTwin</p>
          </div>
          <p className="text-xs text-slate-500">
            50 dual-arm SAPIEN manipulation tasks with structured domain
            randomization.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
              <Beaker className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold text-slate-800">RoboPRO</p>
          </div>
          <p className="text-xs text-slate-500">
            Office / Study / Kitchen Aloha-Agilex tasks, extending RoboTwin.
          </p>
        </div>
      </section>
    </div>
  );
}
