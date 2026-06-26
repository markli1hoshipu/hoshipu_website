/**
 * EmbodyBench frontend API client.
 *
 * - Centralizes /api/bench/* fetches.
 * - Pulls the bench token from localStorage under key 'bench_access_token'.
 * - On 401, clears the token so BenchAuthProvider can route to /login.
 *
 * Future phases add: getBenchmarks, validateSetup, submitRun, listRuns,
 * getRunDetail, listJobs, listEpisodes, etc.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";

export const BENCH_TOKEN_KEY = "bench_access_token";
export const BENCH_USER_KEY = "bench_user";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BenchUser {
  id: number;
  email: string;
  display_name: string | null;
  role: "user" | "admin";
}

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  user: BenchUser;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  display_name?: string;
  role?: "user" | "admin";
}

export class BenchApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(BENCH_TOKEN_KEY);
}

function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(BENCH_TOKEN_KEY);
  localStorage.removeItem(BENCH_USER_KEY);
}

async function request<T>(
  path: string,
  init: RequestInit & { authed?: boolean } = {},
): Promise<T> {
  const { authed = true, headers, ...rest } = init;
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...((headers as Record<string, string>) || {}),
  };
  if (authed) {
    const token = getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, { ...rest, headers: finalHeaders });

  if (res.status === 401 && authed) {
    clearToken();
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // body not JSON; keep statusText
    }
    throw new BenchApiError(res.status, detail);
  }
  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(
  email: string,
  password: string,
  remember: boolean = true,
): Promise<LoginResponse> {
  const data = await request<LoginResponse>("/api/bench/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, remember }),
    authed: false,
  });
  if (typeof window !== "undefined") {
    localStorage.setItem(BENCH_TOKEN_KEY, data.access_token);
    localStorage.setItem(BENCH_USER_KEY, JSON.stringify(data.user));
  }
  return data;
}

export async function getMe(): Promise<BenchUser> {
  return request<BenchUser>("/api/bench/auth/me", { method: "GET" });
}

export function logout(): void {
  clearToken();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request<{ ok: true }>("/api/bench/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function adminCreateUser(req: CreateUserRequest): Promise<BenchUser> {
  return request<BenchUser>("/api/bench/admin/users", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// ---------------------------------------------------------------------------
// Benchmark catalogs + runs (Phase 1)
// ---------------------------------------------------------------------------

export interface CatalogTask {
  name: string;
  category: string;
}

export interface BenchmarkCatalog {
  name: string;
  version: string;
  display_name: string;
  description: string;
  repo_url: string;
  recommended_episodes: number;
  max_episodes_per_task: number;
  default_task_config: string;
  observation_schema: Record<string, string>;
  tasks: CatalogTask[];
}

export interface RunConfig {
  tasks: string[];
  episodes_per_task: number;
  chunk_size?: number;
  task_config?: string;
}

export interface SubmitRunRequest {
  benchmark: "robotwin" | "robopro";
  config: RunConfig;
  eval_mode: "api";
  api_endpoint_url: string;
  api_auth?: { scheme: "bearer" | "none"; token: string };
  notes?: string;
}

export interface SubmitRunResponse {
  run_id: string;
  jobs_queued: number;
  episodes_total: number;
}

export interface ValidationWarning {
  level: "info" | "warn" | "error";
  message: string;
}

export interface ValidationSuggestion {
  change: string;
  reason: string;
}

export interface ValidationResult {
  ok: boolean;
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  skipped_reason?: string;
}

export interface RunSummary {
  id: string;
  benchmark: string;
  state: "queued" | "running" | "completed" | "failed" | "cancelled";
  eval_mode: string;
  api_endpoint_url: string | null;
  submitted_at: string;
  started_at: string | null;
  finished_at: string | null;
  notes: string | null;
  jobs_total: number;
  jobs_done: number;
  episodes_total: number;
  episodes_done: number;
}

export interface RunDetail extends RunSummary {
  config: RunConfig;
  benchmark_version: string;
  per_task: {
    task_name: string;
    attempted: number;
    succeeded: number;
    success_rate: number;
  }[];
}

export interface JobSummary {
  id: string;
  task_name: string;
  seed_offset: number;
  n_episodes: number;
  state: "queued" | "claimed" | "running" | "succeeded" | "failed" | "cancelled";
  attempt_count: number;
  progress: { episodes_done?: number; episodes_succeeded?: number } | null;
  started_at: string | null;
  finished_at: string | null;
  failure_reason: string | null;
}

export async function listBenchmarks(): Promise<BenchmarkCatalog[]> {
  const r = await request<{ benchmarks: BenchmarkCatalog[] }>("/api/bench/benchmarks", {
    method: "GET",
    authed: false, // catalog is public
  });
  return r.benchmarks;
}

export async function validateSetup(
  benchmark: SubmitRunRequest["benchmark"],
  config: RunConfig,
): Promise<ValidationResult> {
  return request<ValidationResult>("/api/bench/setup/validate", {
    method: "POST",
    body: JSON.stringify({ benchmark, config }),
  });
}

export async function submitRun(req: SubmitRunRequest): Promise<SubmitRunResponse> {
  return request<SubmitRunResponse>("/api/bench/runs", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function listRuns(): Promise<RunSummary[]> {
  const r = await request<{ runs: RunSummary[] }>("/api/bench/runs", { method: "GET" });
  return r.runs;
}

export async function getRun(runId: string): Promise<RunDetail> {
  return request<RunDetail>(`/api/bench/runs/${runId}`, { method: "GET" });
}

export async function listJobs(runId: string): Promise<JobSummary[]> {
  const r = await request<{ jobs: JobSummary[] }>(`/api/bench/runs/${runId}/jobs`, {
    method: "GET",
  });
  return r.jobs;
}

export async function cancelRun(runId: string): Promise<void> {
  await request<{ ok: true }>(`/api/bench/runs/${runId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Re-exports for future-phase modules
// ---------------------------------------------------------------------------

export { getToken, clearToken };
