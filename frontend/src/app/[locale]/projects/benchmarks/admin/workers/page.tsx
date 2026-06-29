"use client";

/**
 * Admin → Workers — fleet view.
 *
 * Shows every registered worker with a derived status:
 *   idle      → heartbeat fresh, no running job
 *   busy      → heartbeat fresh, currently running a job
 *   stressed  → fresh, ≥3 job failures in last 10 min (OOM-prone)
 *   offline   → last_heartbeat older than 5 min
 *
 * Polls every 10s so the status indicators stay live.
 */

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { adminListWorkers, type AdminWorker, BenchApiError } from "@/lib/benchApi";
import { useBenchAuth } from "@/contexts/BenchAuthProvider";

const STATUS_STYLE: Record<AdminWorker["derived_status"], string> = {
  idle: "bg-slate-100 text-slate-700",
  busy: "bg-indigo-100 text-indigo-700",
  stressed: "bg-amber-100 text-amber-800",
  offline: "bg-red-100 text-red-700",
};

const STATUS_DESC: Record<AdminWorker["derived_status"], string> = {
  idle: "Heartbeat fresh, no running job",
  busy: "Heartbeat fresh, currently running a job",
  stressed: "≥3 job failures in last 10 min — likely OOM or sim crashes",
  offline: "No heartbeat in 5+ min — Slurm job ended, network dropped, or process killed",
};

function fmtAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function AdminWorkersPage() {
  const { user, loading: authLoading } = useBenchAuth();
  const locale = useLocale();

  const [workers, setWorkers] = useState<AdminWorker[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const data = await adminListWorkers();
        if (!cancelled) {
          setWorkers(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          if (e instanceof BenchApiError && e.status === 403) {
            setError("Admin role required.");
          } else {
            setError((e as Error).message);
          }
        }
      }
      if (cancelled) return;
      timer = setTimeout(tick, 10_000);
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (authLoading || !user) return <div className="text-sm text-slate-500">Loading…</div>;
  if (user.role !== "admin") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        This page is for admins only. Your role: <strong>{user.role}</strong>.
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  // Aggregate counts for the header strip
  const counts = (workers || []).reduce(
    (acc, w) => {
      acc[w.derived_status]++;
      return acc;
    },
    { idle: 0, busy: 0, stressed: 0, offline: 0 } as Record<
      AdminWorker["derived_status"],
      number
    >,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Worker fleet</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every registered worker. Polls every 10s. Stressed = the system is
          backing off this worker because it's been OOMing / crashing recently.
        </p>
      </header>

      {/* Aggregate counts */}
      <div className="grid gap-3 sm:grid-cols-4">
        {(["idle", "busy", "stressed", "offline"] as const).map((s) => (
          <div
            key={s}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">{s}</p>
            <p className={`mt-1 text-2xl font-semibold ${
              s === "busy" ? "text-indigo-600"
              : s === "stressed" ? "text-amber-600"
              : s === "offline" ? "text-red-600"
              : "text-slate-800"
            }`}>{counts[s]}</p>
          </div>
        ))}
      </div>

      {workers === null ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : workers.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No workers have registered yet. Once a Phase 3 worker daemon comes online,
          it'll appear here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Host
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Region
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Kind
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  GPU
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Now running
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Recent fails
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Heartbeat
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workers.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <span
                      title={STATUS_DESC[w.derived_status]}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[w.derived_status]}`}
                    >
                      {w.derived_status}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">
                    {w.hostname}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{w.region}</td>
                  <td className="px-4 py-2 text-slate-500">{w.cluster_kind || "—"}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">
                    {(w.capabilities?.gpu_type as string | undefined) || "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-700">
                    {w.running_job_id ? (
                      <Link
                        href={`/${locale}/projects/benchmarks/runs`}
                        className="font-mono text-indigo-600 hover:underline"
                        title={`Job ID: ${w.running_job_id}`}
                      >
                        {w.running_task_name || w.running_job_id.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    <span className={
                      w.recent_failures_10min >= 3
                        ? "font-semibold text-amber-700"
                        : w.recent_failures_10min > 0
                        ? "text-amber-600"
                        : "text-slate-400"
                    }>
                      {w.recent_failures_10min}
                    </span>
                  </td>
                  <td
                    className="px-4 py-2 text-xs text-slate-500"
                    title={fmtDate(w.last_heartbeat)}
                  >
                    {fmtAge(w.heartbeat_age_sec)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500">
        <strong>How retry works:</strong> when a worker reports a job failed with a retriable
        reason (OOM, sim_crash, gpu_unavailable, network_error, timeout, claim_lost), the job
        goes back to <code className="font-mono">queued</code> and another worker can pick it
        up. After 3 attempts the job stays failed for good. Non-retriable failures
        (user_endpoint_401, bad_action_shape, …) fail immediately on the first try.
      </p>
    </div>
  );
}
