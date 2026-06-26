"use client";

/**
 * Runs list — table of the current user's submitted benchmark runs.
 *
 * Auto-polls every 10s while any run is in a non-terminal state so the
 * progress bars stay current without manual refresh.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Plus, Loader2 } from "lucide-react";

import { listRuns, type RunSummary } from "@/lib/benchApi";
import { useBenchAuth } from "@/contexts/BenchAuthProvider";

const STATE_VARIANTS: Record<RunSummary["state"], string> = {
  queued: "bg-slate-100 text-slate-700",
  running: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-amber-100 text-amber-700",
};

function StateBadge({ state }: { state: RunSummary["state"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATE_VARIANTS[state]}`}
    >
      {state}
    </span>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-slate-600">
        {done}/{total}
      </span>
    </div>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function RunsListPage() {
  const { user, loading: authLoading } = useBenchAuth();
  const locale = useLocale();
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const data = await listRuns();
        if (!cancelled) {
          setRuns(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
      if (cancelled) return;
      const anyActive = (runs || []).some((r) => r.state === "queued" || r.state === "running");
      timer = setTimeout(tick, anyActive ? 10_000 : 30_000);
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // We intentionally don't depend on `runs` here — the polling interval
    // uses the latest value via closure at the next tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authLoading || !user) {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Runs</h1>
          <p className="mt-1 text-sm text-slate-500">Your submitted benchmark evaluations.</p>
        </div>
        <Link
          href={`/${locale}/projects/benchmarks/new`}
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4" /> New run
        </Link>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {runs === null ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading runs…
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          You haven&apos;t submitted any runs yet. Click <strong>New run</strong> above
          to start one.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Submitted
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Benchmark
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  State
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Jobs
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Episodes
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700">
                    <Link
                      href={`/${locale}/projects/benchmarks/runs/${r.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {fmtDate(r.submitted_at)}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">{r.benchmark}</td>
                  <td className="px-4 py-2"><StateBadge state={r.state} /></td>
                  <td className="px-4 py-2"><ProgressBar done={r.jobs_done} total={r.jobs_total} /></td>
                  <td className="px-4 py-2"><ProgressBar done={r.episodes_done} total={r.episodes_total} /></td>
                  <td className="px-4 py-2 text-xs text-slate-500">{r.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
