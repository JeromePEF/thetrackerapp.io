import { api } from "./client";
import type { LeaderboardRankResponse, SiteLeaderboardResponse } from "./types";

export function fetchLeaderboardRank(user: string) {
  return api<LeaderboardRankResponse>("/api/leaderboard/rank", {
    query: { contact: user },
  });
}

export function fetchSiteLeaderboard(category?: string) {
  const query: Record<string, string> = {};
  if (category) query.category = category;
  return api<SiteLeaderboardResponse>("/api/site-leaderboard", { query });
}
