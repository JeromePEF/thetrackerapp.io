import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/lib/api/client";
import { fetchPortal } from "@/lib/api/portal";
import type { PortalResponse } from "@/lib/api/types";
import { useAuth, useContact } from "@/state/auth";

export default function AccountScreen() {
  const { session, signOut } = useAuth();
  const contact = useContact();
  const [portal, setPortal] = useState<PortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!contact) return;
    setError(null);
    try {
      setPortal(await fetchPortal(contact));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await signOut();
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load account.");
    }
  }, [contact, signOut]);

  useEffect(() => {
    void (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const username = portal?.profile?.username || portal?.account?.username || session?.account?.username;
  const email = portal?.profile?.primaryEmail || portal?.account?.primaryEmail || session?.account?.email;
  const phone = portal?.profile?.primaryPhone;
  const age = portal?.profile?.age ?? portal?.account?.age;

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl tintColor="#38ffd3" refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Row label="Username" value={username} />
        <Row label="Email" value={email} />
        <Row label="Phone" value={phone} />
        <Row label="Age" value={age != null ? String(age) : undefined} />
        <Row label="Account ID" value={session?.account?.accountId} mono />

        <Pressable
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.mono]} selectable>
        {value || "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#021416" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#021416" },
  content: { paddingHorizontal: 20, paddingVertical: 24, gap: 12 },
  error: { color: "#ff6b6b", fontSize: 14 },
  row: {
    backgroundColor: "#0a2026",
    borderRadius: 12,
    padding: 16,
    borderColor: "#1f3b44",
    borderWidth: 1,
  },
  rowLabel: { color: "#8a96a8", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2 },
  rowValue: { color: "#ecf4ff", fontSize: 18, fontWeight: "500", marginTop: 4 },
  mono: { fontFamily: "Menlo", fontSize: 14 },
  signOut: {
    marginTop: 24,
    backgroundColor: "#0a2026",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderColor: "#ff6b6b",
    borderWidth: 1,
  },
  signOutLabel: { color: "#ff6b6b", fontSize: 16, fontWeight: "600" },
});
