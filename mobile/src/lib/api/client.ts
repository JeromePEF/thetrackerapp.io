/**
 * Thin fetch wrapper around the TheTrackerApp backend.
 *
 * - Auto-attaches `Authorization: Bearer <sessionToken>` when one is loaded.
 * - All endpoints live on api.thetrackerapp.io (no Vercel proxy on mobile).
 * - Throws ApiError with a stable shape so screens can render nice errors.
 */

export const API_BASE = "https://api.thetrackerapp.io";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

let _token: string | null = null;

export function setSessionToken(token: string | null) {
  _token = token;
}

export function getSessionToken(): string | null {
  return _token;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  /** Set to false to skip Authorization header even when a token is loaded. */
  auth?: boolean;
  signal?: AbortSignal;
};

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true, signal } = opts;

  const url = new URL(path.startsWith("http") ? path : API_BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && _token) headers["Authorization"] = `Bearer ${_token}`;

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    throw new ApiError(
      `Network error contacting ${url.host}`,
      0,
      err instanceof Error ? { message: err.message } : null,
    );
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === "object" && "message" in parsed && typeof (parsed as any).message === "string"
        ? (parsed as any).message
        : null) || `HTTP ${res.status}`;
    throw new ApiError(message, res.status, parsed);
  }

  return parsed as T;
}
