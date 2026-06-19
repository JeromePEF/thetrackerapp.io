/** Backend response shapes consumed by the mobile app. */

export type LoginMethod = "phone" | "email" | "username";

export interface RequestCodeResponse {
  requestId?: string;
  request_id?: string;
  challengeId?: string;
  verificationId?: string;
  maskedDestination?: string;
  masked_destination?: string;
  to?: string;
  expiresAt?: string;
  expires_at?: string;
  codeLength?: number;
  code_length?: number;
  otpLength?: number;
}

export interface VerifyCodeResponse {
  sessionToken?: string;
  session_token?: string;
  sessionExpiresAt?: string;
  session_expires_at?: string;
  account?: AccountSnapshot;
  user?: AccountSnapshot;
}

export interface AccountSnapshot {
  accountId?: string;
  id?: string;
  canonical?: string;
  username?: string;
  email?: string;
  primaryEmail?: string;
  age?: string | number;
  billingStatus?: string;
  subscriptionStatus?: string;
  sheetUrl?: string;
  googleSheetUrl?: string;
  affiliateCode?: string;
  referralCode?: string;
}

/** GET /api/portal — unified hydration for Account + Billing + Sheet tabs. */
export interface PortalResponse {
  contact?: string;
  profile?: {
    username?: string;
    primaryEmail?: string;
    primaryPhone?: string;
    age?: string | number;
    googleSheetUrl?: string;
    googleSheetId?: string;
    stripeSubscriptionStatus?: string;
    stripePlanKey?: "monthly" | "yearly" | string;
    stripeCancelAtPeriodEnd?: boolean;
    stripeCurrentPeriodEnd?: string;
  };
  account?: {
    username?: string;
    primaryEmail?: string;
    age?: string | number;
  };
  membership?: {
    status?: string;
    plan?: string;
    planName?: string;
    nextBillingDate?: string;
  };
  billing?: {
    status?: string;
    plan?: string;
  };
  stripeBillingUrl?: string;
  billingPortalUrl?: string;
  googleSheet?: string;
  googleSheetUrl?: string;
}

/** GET /api/stats/range */
export interface StatsRangeResponse {
  workoutsLogged?: number | { value: number; sheetUrl?: string };
  caloriesTracked?: number | { value: number; sheetUrl?: string };
  gallonsDrank?: number | { value: number; sheetUrl?: string };
  usersUsingToday?: number;
  masterLogSheetUrl?: string;
}

export function pickNumber(v: number | { value: number } | undefined): number {
  if (v === undefined || v === null) return 0;
  if (typeof v === "number") return v;
  return typeof v.value === "number" ? v.value : 0;
}

/** POST /api/chat/message */
export interface ChatMessageResponse {
  ok?: boolean;
  sessionId?: string;
  reply?: string;
  mode?: "ai" | "agent";
  handedOff?: boolean;
  suggestedActions?: { label: string; url?: string; kind?: string }[];
}

/** GET /api/chat/messages */
export interface ChatPollResponse {
  ok?: boolean;
  mode?: string;
  messages?: {
    id?: string;
    role?: "ai" | "agent" | "user" | "system";
    text?: string;
    agentName?: string;
    ts?: string;
  }[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai" | "agent";
  text: string;
  ts: string;
}

/** GET/POST /api/account/goals */
export interface GoalsResponse {
  weightGoal?: string;
  bodyFatGoal?: string;
  workoutPlan?: string;
  selectedPlanDays?: number;
}

/** GET /api/leaderboard/rank */
export interface LeaderboardRankResponse {
  ok?: boolean;
  rank?: number;
  leaderboardRank?: number;
  position?: number;
  data?: { rank?: number; leaderboardRank?: number; position?: number };
}

/** GET /api/site-leaderboard (public) */
export interface SiteLeaderboardResponse {
  ok?: boolean;
  entries?: LeaderboardEntry[];
  groupEntries?: LeaderboardEntry[];
  strength?: LeaderboardEntry[];
  calisthenics?: LeaderboardEntry[];
  streaks?: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  name?: string;
  canonical?: string;
  exercise?: string;
  value?: string | number;
  score?: string | number;
  rank?: number;
}

/** GET /api/user/measurements */
export interface MeasurementsResponse {
  ok?: boolean;
  measurements?: Measurement[];
  journals?: Record<string, JournalEntry>;
  goals?: Record<string, string | number>;
  averages?: Record<string, string | number>;
}

export interface Measurement {
  id?: string;
  date?: string;
  height?: number | string;
  weight?: number | string;
  bodyFat?: number | string;
  neck?: number | string;
  shoulders?: number | string;
  chest?: number | string;
  leftBicep?: number | string;
  rightBicep?: number | string;
  leftForearm?: number | string;
  rightForearm?: number | string;
  waist?: number | string;
  hips?: number | string;
  leftThigh?: number | string;
  rightThigh?: number | string;
  leftCalf?: number | string;
  rightCalf?: number | string;
}

export interface JournalEntry {
  label?: string;
  notes?: string;
  updatedAt?: string;
}

/** POST /api/user/visibility */
export interface VisibilityPayload {
  merged?: boolean;
  workouts?: boolean;
  nutrition?: boolean;
  water?: boolean;
  statsBar?: boolean;
  leaderboard?: boolean;
  recentWorkouts?: boolean;
  publicLeaderboard?: boolean;
}
