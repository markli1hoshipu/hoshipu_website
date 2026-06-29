"use client";

/**
 * New run wizard — 4 steps:
 *   1. Pick benchmark (RoboTwin / RoboPRO)
 *   2. Configure tasks + episodes; live /setup/validate
 *   3. Pick eval mode (API enabled, Checkpoint "coming soon")
 *   4. Provide endpoint URL + auth + review + submit
 *
 * Single-page implementation with conditional rendering per step.
 * State stays in this component — no global store needed for a 4-step flow.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { ArrowLeft, ArrowRight, Check, AlertTriangle, Info, Loader2, Lock } from "lucide-react";

import {
  type BenchmarkCatalog,
  type ValidationResult,
  listBenchmarks,
  validateSetup,
  submitRun,
  BenchApiError,
} from "@/lib/benchApi";
import { useBenchAuth } from "@/contexts/BenchAuthProvider";

type BenchmarkId = "robotwin" | "robopro";

interface FormState {
  benchmark: BenchmarkId | null;
  selectedTasks: Set<string>;
  episodesPerTask: number;
  chunkSize: number | null; // null = default to episodesPerTask
  apiEndpointUrl: string;
  authScheme: "bearer" | "none";
  authToken: string;
  notes: string;
}

const INITIAL: FormState = {
  benchmark: null,
  selectedTasks: new Set(),
  episodesPerTask: 20,
  chunkSize: null,
  apiEndpointUrl: "",
  authScheme: "none",
  authToken: "",
  notes: "",
};

// Computes the same partition the backend will, for live preview.
function partitionStats(
  selectedTasks: Set<string>,
  episodesPerTask: number,
  chunkSize: number | null,
): { totalEpisodes: number; jobsQueued: number; chunkSizeEffective: number } {
  const cs = Math.min(chunkSize ?? episodesPerTask, episodesPerTask);
  const numChunksPerTask = Math.ceil(episodesPerTask / cs);
  const numTasks = selectedTasks.size;
  return {
    totalEpisodes: numTasks * episodesPerTask,
    jobsQueued: numTasks * numChunksPerTask,
    chunkSizeEffective: cs,
  };
}

export default function NewRunPage() {
  const { user, loading: authLoading } = useBenchAuth();
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [catalog, setCatalog] = useState<BenchmarkCatalog[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load benchmarks catalog on mount.
  useEffect(() => {
    listBenchmarks()
      .then(setCatalog)
      .catch((e) => setCatalogError(e?.message || "failed to load benchmarks"));
  }, []);

  const currentBench = useMemo<BenchmarkCatalog | undefined>(
    () => catalog?.find((b) => b.name === form.benchmark),
    [catalog, form.benchmark],
  );

  const stats = partitionStats(form.selectedTasks, form.episodesPerTask, form.chunkSize);

  // Debounced setup validation on Step 2.
  useEffect(() => {
    if (step !== 2 || !form.benchmark || form.selectedTasks.size === 0) {
      setValidation(null);
      return;
    }
    setValidating(true);
    const handle = setTimeout(async () => {
      try {
        const v = await validateSetup(form.benchmark!, {
          tasks: Array.from(form.selectedTasks),
          episodes_per_task: form.episodesPerTask,
          chunk_size: form.chunkSize ?? form.episodesPerTask,
        });
        setValidation(v);
      } catch {
        // network glitch — silently drop, the validator is non-blocking anyway
      } finally {
        setValidating(false);
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [step, form.benchmark, form.selectedTasks, form.episodesPerTask, form.chunkSize]);

  if (authLoading || !user) {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }

  const canAdvance: Record<number, boolean> = {
    1: !!form.benchmark,
    2:
      form.selectedTasks.size > 0 &&
      form.episodesPerTask >= 1 &&
      (validation?.ok ?? true),
    3: true, // mode is locked to API in v1
    4: form.apiEndpointUrl.length > 0,
  };

  const handleSubmit = async () => {
    if (!form.benchmark) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitRun({
        benchmark: form.benchmark,
        config: {
          tasks: Array.from(form.selectedTasks),
          episodes_per_task: form.episodesPerTask,
          chunk_size: form.chunkSize ?? form.episodesPerTask,
        },
        eval_mode: "api",
        api_endpoint_url: form.apiEndpointUrl,
        api_auth:
          form.authScheme === "bearer" && form.authToken
            ? { scheme: "bearer", token: form.authToken }
            : { scheme: "none", token: "" },
        notes: form.notes || undefined,
      });
      router.push(`/${locale}/projects/benchmarks/runs/${res.run_id}`);
    } catch (e) {
      const msg =
        e instanceof BenchApiError ? e.message : (e as Error)?.message || "submit failed";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">New benchmark run</h1>
        <p className="mt-1 text-sm text-slate-500">
          Submit a model API endpoint to be evaluated on RoboTwin or RoboPRO.
        </p>
      </header>

      <Stepper step={step} />

      {catalogError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn&apos;t load benchmarks: {catalogError}
        </div>
      )}

      {step === 1 && (
        <Step1PickBenchmark
          catalog={catalog}
          form={form}
          setForm={setForm}
        />
      )}
      {step === 2 && currentBench && (
        <Step2Config
          bench={currentBench}
          form={form}
          setForm={setForm}
          validation={validation}
          validating={validating}
          stats={stats}
        />
      )}
      {step === 3 && <Step3Mode />}
      {step === 4 && currentBench && (
        <Step4ReviewSubmit
          bench={currentBench}
          form={form}
          setForm={setForm}
          stats={stats}
        />
      )}

      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step < 4 ? (
          <button
            onClick={() => setStep((s) => Math.min(4, s + 1))}
            disabled={!canAdvance[step]}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-40"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canAdvance[4] || submitting}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-40"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                Submit run <Check className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

function Stepper({ step }: { step: number }) {
  const labels = ["Benchmark", "Configure", "Eval mode", "Review"];
  return (
    <ol className="flex w-full items-center gap-2">
      {labels.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                done
                  ? "bg-indigo-500 text-white"
                  : active
                  ? "border-2 border-indigo-500 bg-white text-indigo-600"
                  : "border border-slate-300 bg-white text-slate-400"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : n}
            </span>
            <span
              className={`whitespace-nowrap text-xs font-medium ${
                active ? "text-slate-900" : done ? "text-slate-600" : "text-slate-400"
              }`}
            >
              {label}
            </span>
            {i < labels.length - 1 && (
              <span
                className={`h-px flex-1 ${done ? "bg-indigo-500" : "bg-slate-200"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Step 1: pick benchmark
// ---------------------------------------------------------------------------

function Step1PickBenchmark({
  catalog,
  form,
  setForm,
}: {
  catalog: BenchmarkCatalog[] | null;
  form: FormState;
  setForm: (f: FormState) => void;
}) {
  if (catalog === null) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading benchmarks…
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {catalog.map((b) => {
        const picked = form.benchmark === b.name;
        return (
          <button
            key={b.name}
            onClick={() =>
              setForm({
                ...form,
                benchmark: b.name as BenchmarkId,
                selectedTasks: new Set(),
                episodesPerTask: b.recommended_episodes,
                chunkSize: null,
              })
            }
            className={`rounded-xl border bg-white p-5 text-left shadow-sm transition-colors ${
              picked
                ? "border-indigo-500 ring-2 ring-indigo-500/30"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <p className="text-base font-semibold text-slate-900">{b.display_name}</p>
            <p className="mt-1 text-xs text-slate-500">v{b.version} · {b.tasks.length} tasks</p>
            <p className="mt-3 text-sm text-slate-600">{b.description}</p>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: configure
// ---------------------------------------------------------------------------

function Step2Config({
  bench,
  form,
  setForm,
  validation,
  validating,
  stats,
}: {
  bench: BenchmarkCatalog;
  form: FormState;
  setForm: (f: FormState) => void;
  validation: ValidationResult | null;
  validating: boolean;
  stats: ReturnType<typeof partitionStats>;
}) {
  // Group tasks by category for display.
  const grouped = useMemo(() => {
    const g = new Map<string, typeof bench.tasks>();
    for (const t of bench.tasks) {
      if (!g.has(t.category)) g.set(t.category, []);
      g.get(t.category)!.push(t);
    }
    return Array.from(g.entries());
  }, [bench]);

  const toggleAll = (taskNames: string[], on: boolean) => {
    const next = new Set(form.selectedTasks);
    for (const n of taskNames) (on ? next.add(n) : next.delete(n));
    setForm({ ...form, selectedTasks: next });
  };

  return (
    <div className="space-y-5">
      {/* Tasks selector */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Tasks</h2>
            <p className="text-xs text-slate-500">
              {form.selectedTasks.size} of {bench.tasks.length} selected
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toggleAll(bench.tasks.map((t) => t.name), true)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Select all
            </button>
            <button
              onClick={() => toggleAll(bench.tasks.map((t) => t.name), false)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-3 space-y-3">
          {grouped.map(([category, tasks]) => {
            const taskNames = tasks.map((t) => t.name);
            const selectedInCat = taskNames.filter((n) => form.selectedTasks.has(n)).length;
            const allInCat = selectedInCat === tasks.length;
            const noneInCat = selectedInCat === 0;
            return (
              <details key={category} open className="rounded-lg border border-slate-100">
                <summary className="flex cursor-pointer items-center justify-between rounded-t-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  <span>
                    {category}
                    <span className="ml-2 font-normal tabular-nums text-slate-500">
                      ({selectedInCat}/{tasks.length})
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleAll(taskNames, !allInCat);
                      }}
                      className={`rounded border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                        allInCat
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                      title={allInCat ? `Clear all ${category}` : `Select all ${category}`}
                    >
                      {allInCat ? "Clear all" : "Select all"}
                    </button>
                    {!noneInCat && !allInCat && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleAll(taskNames, false);
                        }}
                        className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                        title={`Clear ${category}`}
                      >
                        Clear
                      </button>
                    )}
                  </span>
                </summary>
                <div className="grid gap-1 p-2 md:grid-cols-2">
                  {tasks.map((t) => {
                    const checked = form.selectedTasks.has(t.name);
                    return (
                      <label
                        key={t.name}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(form.selectedTasks);
                            e.target.checked ? next.add(t.name) : next.delete(t.name);
                            setForm({ ...form, selectedTasks: next });
                          }}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500/40"
                        />
                        <span className="font-mono text-slate-700">{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </div>

      {/* Episodes per task */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-xs font-medium text-slate-700">
          Episodes per task
        </label>
        <input
          type="number"
          min={1}
          max={bench.max_episodes_per_task}
          value={form.episodesPerTask}
          onChange={(e) =>
            setForm({ ...form, episodesPerTask: parseInt(e.target.value || "1") })
          }
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <p className="mt-2 text-xs text-slate-500">
          Recommended {bench.recommended_episodes}. Hard cap {bench.max_episodes_per_task}.
          {" "}One worker job per task — the simulator boots once per task and runs all
          episodes sequentially in that process for efficiency.
        </p>
      </div>

      {/* Partition preview */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
        <p className="text-sm font-medium text-slate-800">
          {stats.totalEpisodes.toLocaleString()} total episodes across{" "}
          {form.selectedTasks.size} task{form.selectedTasks.size === 1 ? "" : "s"} →{" "}
          <span className="font-semibold text-indigo-700">{stats.jobsQueued} jobs</span>
        </p>
      </div>

      {/* Validation */}
      <ValidationPanel validation={validation} validating={validating} />
    </div>
  );
}

function ValidationPanel({
  validation,
  validating,
}: {
  validation: ValidationResult | null;
  validating: boolean;
}) {
  if (validating) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
        Sanity-checking your config…
      </div>
    );
  }
  if (!validation) return null;
  const hasItems = validation.warnings.length > 0 || validation.suggestions.length > 0;
  if (!hasItems) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
        <Check className="mr-2 inline h-4 w-4" />
        Config looks good
        {validation.skipped_reason && (
          <span className="ml-2 text-xs text-slate-500">
            (validator skipped: {validation.skipped_reason})
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {validation.warnings.map((w, i) => {
        const palette =
          w.level === "error"
            ? "border-red-200 bg-red-50 text-red-800"
            : w.level === "warn"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-slate-200 bg-slate-50 text-slate-700";
        const Icon = w.level === "info" ? Info : AlertTriangle;
        return (
          <div key={i} className={`rounded-xl border p-3 text-sm ${palette}`}>
            <Icon className="mr-2 inline h-4 w-4" />
            {w.message}
          </div>
        );
      })}
      {validation.suggestions.map((s, i) => (
        <div key={i} className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-slate-800">
          <span className="font-medium text-indigo-700">Suggest:</span> {s.change}
          <span className="ml-1 text-slate-500">— {s.reason}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: eval mode
// ---------------------------------------------------------------------------

function Step3Mode() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border-2 border-indigo-500 bg-white p-5 ring-2 ring-indigo-500/30">
        <p className="text-base font-semibold text-slate-900">Evaluate by API</p>
        <p className="mt-2 text-sm text-slate-600">
          You provide an HTTP endpoint we&apos;ll POST observations to. We spawn the
          simulator on our GPUs and run rollouts; your model lives wherever you host it.
        </p>
        <p className="mt-3 text-xs font-medium text-indigo-600">Selected</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 opacity-60">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-slate-500" />
          <p className="text-base font-semibold text-slate-700">Evaluate by checkpoint</p>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Provide a Hugging Face checkpoint + training config; we host both server and
          simulator on our GPUs.
        </p>
        <p className="mt-3 text-xs font-medium text-slate-500">Coming soon</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: endpoint + review + submit
// ---------------------------------------------------------------------------

function Step4ReviewSubmit({
  bench,
  form,
  setForm,
  stats,
}: {
  bench: BenchmarkCatalog;
  form: FormState;
  setForm: (f: FormState) => void;
  stats: ReturnType<typeof partitionStats>;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Your model endpoint</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Endpoint URL
            </label>
            <input
              type="url"
              placeholder="https://my-vla.example.com"
              value={form.apiEndpointUrl}
              onChange={(e) => setForm({ ...form, apiEndpointUrl: e.target.value })}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="mt-1 text-xs text-slate-500">
              Must serve <code className="font-mono">/episode/init</code>,
              <code className="font-mono"> /episode/{`{id}`}/step</code>, and
              <code className="font-mono"> /episode/{`{id}`}/finalize</code>.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Auth (optional)
            </label>
            <div className="mt-2 flex items-center gap-2">
              <select
                value={form.authScheme}
                onChange={(e) =>
                  setForm({ ...form, authScheme: e.target.value as "bearer" | "none" })
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="none">No auth</option>
                <option value="bearer">Bearer token</option>
              </select>
              {form.authScheme === "bearer" && (
                <input
                  type="password"
                  placeholder="token"
                  value={form.authToken}
                  onChange={(e) => setForm({ ...form, authToken: e.target.value })}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              )}
            </div>
            {form.authScheme === "bearer" && (
              <p className="mt-1 text-xs text-slate-500">
                Stored encrypted at rest (Fernet). Visible only to the worker that runs your jobs.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Notes (optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g., 'baseline VLA v3, no language perturbation'"
              rows={2}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Review</h2>
        <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <SummaryRow k="Benchmark" v={`${bench.display_name} v${bench.version}`} />
          <SummaryRow k="Tasks" v={`${form.selectedTasks.size} selected`} />
          <SummaryRow k="Episodes per task" v={String(form.episodesPerTask)} />
          <SummaryRow k="Total episodes" v={stats.totalEpisodes.toLocaleString()} />
          <SummaryRow k="Jobs queued" v={stats.jobsQueued.toLocaleString()} />
          <SummaryRow k="Eval mode" v="API" />
          <SummaryRow k="Auth" v={form.authScheme === "bearer" ? "Bearer token" : "None"} />
        </dl>
      </div>
    </div>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 pb-1.5 last:border-b-0 last:pb-0">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
      <dd className="font-medium text-slate-800">{v}</dd>
    </div>
  );
}
