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

export async function login(email: string, password: string): Promise<LoginResponse> {
  const data = await request<LoginResponse>("/api/bench/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
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
// Re-exports for future-phase modules
// ---------------------------------------------------------------------------

export { getToken, clearToken };
