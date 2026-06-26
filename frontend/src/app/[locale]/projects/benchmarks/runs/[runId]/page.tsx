"use client";

/**
 * Run detail — header + per-task aggregate + jobs table + cancel.
 * Polls every 10s while the run or any job is non-terminal.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Loader2, X } from "lucide-react";

import {
  type RunDetail,
  type JobSummary,
  getRun,
  listJobs,
  cancelRun,
  BenchApiError,
} from "@/lib/benchApi";
import { useBenchAuth } from "@/contexts/BenchAuthProvider";

const RUN_STATE_VARIANTS: Record<RunDetail["state"], string> = {
  queued: "bg-slate-100 text-slate-700",
  running: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-amber-100 text-amber-700",
};

const JOB_STATE_VARIANTS: Record<JobSummary["state"], string> = {
  queued: "bg-slate-100 text-slate-600",
  claimed: "bg-blue-100 text-blue-700",
  running: "bg-indigo-100 text-indigo-700",
  succeeded: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-amber-100 text-amber-700",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function pct(num: number, denom: number) {
  if (denom <= 0) return "—";
  return `${Math.round((num / denom) * 100)}%`;
}

export default function RunDetailPage() {
  const { user, loading: authLoading } = useBenchAuth();
  const router = useRouter();
  const locale = useLocale();
  const params = useParams<{ runId: string }>();
  const runId = params.runId;

  const [run, setRun] = useState<RunDetail | null>(null);
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const [r, j] = await Promise.all([getRun(runId), listJobs(runId)]);
        if (!cancelled) {
          setRun(r);
          setJobs(j);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          if (e instanceof BenchApiError && e.status === 404) {
            setError("Run not found");
          } else {
            setError((e as Error).message);
          }
        }
      }
      if (cancelled) return;
      const stillActive =
        run && (run.state === "queued" || run.state === "running");
      timer = setTimeout(tick, stillActive ? 10_000 : 30_000);
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const handleCancel = async () => {
    if (!confirm("Cancel this run? Queued jobs will be marked cancelled.")) return;
    setCancelling(true);
    try {
      await cancelRun(runId);
      // refresh
      const [r, j] = await Promise.all([getRun(runId), listJobs(runId)]);
      setRun(r);
      setJobs(j);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCancelling(false);
    }
  };

  if (authLoading || !user) return <div className="text-sm text-slate-500">Loading…</div>;
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
        <Link
          href={`/${locale}/projects/benchmarks/runs`}
          className="ml-2 text-indigo-600 hover:underline"
        >
          Back to runs
        </Link>
      </div>
    );
  }
  if (!run || !jobs) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading run…
      </div>
    );
  }

  const terminal = ["completed", "failed", "cancelled"].includes(run.state);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href={`/${locale}/projects/benchmarks/runs`}
            className="text-xs text-indigo-600 hover:underline"
          >
            ← Runs
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-900">
            {run.benchmark} v{run.benchmark_version}
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${RUN_STATE_VARIANTS[run.state]}`}
            >
              {run.state}
            </span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Submitted {fmtDate(run.submitted_at)} · ID{" "}
            <span className="font-mono">{run.id.slice(0, 8)}</span>
          </p>
          {run.notes && (
            <p className="mt-2 max-w-xl rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {run.notes}
            </p>
          )}
        </div>
        {!terminal && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            <X className="h-4 w-4" /> {cancelling ? "Cancelling…" : "Cancel run"}
          </button>
        )}
      </header>

      {/* Aggregate */}
      <section className="grid gap-4 sm:grid-cols-4">
        <Stat title="Jobs" value={`${run.jobs_done}/${run.jobs_total}`} sub={pct(run.jobs_done, run.jobs_total)} />
        <Stat title="Episodes" value={`${run.episodes_done}/${run.episodes_total}`} sub={pct(run.episodes_done, run.episodes_total)} />
        <Stat title="Tasks" value={String(run.config.tasks.length)} sub={`${run.config.episodes_per_task}/task`} />
        <Stat
          title="Endpoint"
          value={
            run.api_endpoint_url ? new URL(run.api_endpoint_url).host : "—"
          }
          sub={run.eval_mode}
          mono
        />
      </section>

      {/* Per-task aggregate */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Per-task success rate</h2>
          <p className="text-xs text-slate-500">
            Computed from completed episodes. Empty until workers come online.
          </p>
        </div>
        {run.per_task.length === 0 ? (
          <div className="px-5 py-5 text-sm text-slate-500">No episode results yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Task
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Attempted
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Succeeded
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {run.per_task.map((pt) => (
                <tr key={pt.task_name}>
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">{pt.task_name}</td>
                  <td className="px-4 py-2 tabular-nums text-slate-700">{pt.attempted}</td>
                  <td className="px-4 py-2 tabular-nums text-slate-700">{pt.succeeded}</td>
                  <td className="px-4 py-2 tabular-nums font-medium text-slate-800">
                    {(pt.success_rate * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Jobs table */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Jobs ({jobs.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Task
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Chunk
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Episodes
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                State
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Progress
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Started
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.map((j) => (
              <tr key={j.id}>
                <td className="px-4 py-2 font-mono text-xs text-slate-700">{j.task_name}</td>
                <td className="px-4 py-2 tabular-nums text-slate-600">#{j.seed_offset}</td>
                <td className="px-4 py-2 tabular-nums text-slate-700">{j.n_episodes}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${JOB_STATE_VARIANTS[j.state]}`}
                  >
                    {j.state}
                  </span>
                  {j.failure_reason && (
                    <p className="mt-0.5 text-xs text-red-600">{j.failure_reason}</p>
                  )}
                </td>
                <td className="px-4 py-2 tabular-nums text-xs text-slate-600">
                  {j.progress?.episodes_done ?? 0}/{j.n_episodes}
                </td>
                <td className="px-4 py-2 text-xs text-slate-600">{fmtDate(j.started_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({
  title,
  value,
  sub,
  mono,
}: {
  title: string;
  value: string;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`mt-1 text-lg font-semibold text-slate-900 ${mono ? "font-mono text-sm" : ""}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
