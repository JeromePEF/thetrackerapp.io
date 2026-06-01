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
