import { api, ApiError } from "./client";
import type { LoginMethod, RequestCodeResponse, VerifyCodeResponse } from "./types";

/** Endpoints the web FE tries, in order. We mirror the same fallback chain. */
const REQUEST_PATHS = [
  "/api/auth/login-code/request",
  "/api/auth/code/request",
  "/api/login-code/request",
];

const VERIFY_PATHS = [
  "/api/auth/login-code/verify",
  "/api/auth/code/verify",
  "/api/login-code/verify",
];

function detectMethod(raw: string): { method: LoginMethod; identifier: string } {
  const value = raw.trim();
  if (value.includes("@") && value.indexOf("@") > 0 && /\./.test(value.split("@")[1] || "")) {
    return { method: "email", identifier: value.toLowerCase() };
  }
  // Phone: only digits / + / spaces / dashes / parens
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length >= 7 && /^[\d+()\-.\s]+$/.test(value)) {
    const e164 = value.startsWith("+") ? "+" + digits : digits.length === 10 ? "+1" + digits : "+" + digits;
    return { method: "phone", identifier: e164 };
  }
  return { method: "username", identifier: value.toLowerCase().replace(/^@/, "") };
}

export async function requestLoginCode(rawCredential: string): Promise<{
  method: LoginMethod;
  identifier: string;
  requestId: string;
  maskedDestination: string;
  codeLength: number;
}> {
  const { method, identifier } = detectMethod(rawCredential);

  const body: Record<string, unknown> = {
    method,
    identifier,
    requestedAt: new Date().toISOString(),
    client: { platform: "mobile" },
  };
  if (method === "phone") body.contact = body.phone = identifier;
  if (method === "email") body.email = identifier;
  if (method === "username") body.username = identifier;

  let lastErr: unknown = null;
  for (const path of REQUEST_PATHS) {
    try {
      const res = await api<RequestCodeResponse>(path, { method: "POST", body, auth: false });
      const requestId = res.requestId || res.request_id || res.challengeId || res.verificationId || "";
      if (!requestId) throw new ApiError("Server did not return a requestId", 500, res);
      return {
        method,
        identifier,
        requestId,
        maskedDestination: res.maskedDestination || res.masked_destination || res.to || identifier,
        codeLength: res.codeLength || res.code_length || res.otpLength || 8,
      };
    } catch (err) {
      lastErr = err;
      if (err instanceof ApiError && err.status === 404) continue; // try next fallback
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Could not request login code");
}

export async function verifyEmail(): Promise<{ ok: boolean; message?: string }> {
  return api<{ ok: boolean; message?: string }>("/api/account/email/verify", { method: "POST" });
}

export async function saveVisibility(visibility: Record<string, boolean>) {
  return api<{ ok: boolean }>("/api/user/visibility", {
    method: "POST",
    body: { visibility },
  });
}

/** DELETE /api/account — irreversible account deletion (both stores require this). */
export async function deleteAccount(reason?: string): Promise<{ ok: true; deletedAt: string }> {
  return api<{ ok: true; deletedAt: string }>("/api/account", {
    method: "DELETE",
    body: { confirmation: "DELETE", reason: reason ?? null },
  });
}

export async function verifyLoginCode(args: {
  method: LoginMethod;
  identifier: string;
  requestId: string;
  code: string;
}): Promise<{ sessionToken: string; sessionExpiresAt: string | null; account: VerifyCodeResponse["account"] }> {
  const body = {
    method: args.method,
    identifier: args.identifier,
    requestId: args.requestId,
    request_id: args.requestId,
    code: args.code.trim().toUpperCase(),
  };

  let lastErr: unknown = null;
  for (const path of VERIFY_PATHS) {
    try {
      const res = await api<VerifyCodeResponse>(path, { method: "POST", body, auth: false });
      const sessionToken = res.sessionToken || res.session_token;
      if (!sessionToken) throw new ApiError("Server did not return a session token", 500, res);
      return {
        sessionToken,
        sessionExpiresAt: res.sessionExpiresAt || res.session_expires_at || null,
        account: res.account || res.user,
      };
    } catch (err) {
      lastErr = err;
      if (err instanceof ApiError && err.status === 404) continue;
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Could not verify login code");
}
