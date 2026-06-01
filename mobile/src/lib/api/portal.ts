import { api } from "./client";
import type { PortalResponse, StatsRangeResponse } from "./types";

/** GET /api/portal — hydrates Account, Billing, and Sheet tabs in one call. */
export function fetchPortal(contact: string) {
  return api<PortalResponse>("/api/portal", { query: { contact } });
}

/** GET /api/stats/range — series totals for the configured date range. */
export function fetchStatsRange(args: { contact: string; from: string; to: string }) {
  return api<StatsRangeResponse>("/api/stats/range", {
    query: { contact: args.contact, from: args.from, to: args.to },
  });
}

/** Date helpers expected by /api/stats/range (YYYY-MM-DD). */
export function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function last7DaysRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 6);
  return { from: isoDay(from), to: isoDay(to) };
}
