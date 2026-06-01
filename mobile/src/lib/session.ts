/**
 * Persistent session storage.
 *
 * Uses expo-secure-store on native (iOS Keychain / Android Keystore) and falls
 * back to AsyncStorage-equivalent on web. The session is just the bearer token
 * + a snapshot of the account so the UI can render before the network responds.
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_KEY = "tracker.auth.session";

export interface PersistedSession {
  token: string;
  expiresAt: string | null;
  account: {
    accountId?: string;
    canonical?: string;
    username?: string;
    email?: string;
  } | null;
}

async function read(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function write(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* noop */
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function remove(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* noop */
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function loadSession(): Promise<PersistedSession | null> {
  const raw = await read(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed.token) return null;
    if (parsed.expiresAt) {
      const expiry = Date.parse(parsed.expiresAt);
      if (Number.isFinite(expiry) && expiry < Date.now()) return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: PersistedSession): Promise<void> {
  return write(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): Promise<void> {
  return remove(SESSION_KEY);
}
