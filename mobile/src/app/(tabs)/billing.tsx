import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/lib/api/client";
import { fetchPortal } from "@/lib/api/portal";
import type { PortalResponse } from "@/lib/api/types";
import { useAuth, useContact } from "@/state/auth";

export default function BillingScreen() {
  const { signOut } = useAuth();
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
      setError(err instanceof Error ? err.message : "Could not load billing.");
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

  const status = portal?.membership?.status || portal?.billing?.status || portal?.profile?.stripeSubscriptionStatus;
  const plan = portal?.membership?.planName || portal?.membership?.plan || portal?.profile?.stripePlanKey;
  const nextBilling = portal?.membership?.nextBillingDate || portal?.profile?.stripeCurrentPeriodEnd;
  const portalUrl = portal?.stripeBillingUrl || portal?.billingPortalUrl;

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl tintColor="#38ffd3" refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Row label="Status" value={status} />
        <Row label="Plan" value={plan} />
        <Row label="Next billing" value={nextBilling} />

        <Pressable
          onPress={() => portalUrl && void WebBrowser.openBrowserAsync(portalUrl)}
          disabled={!portalUrl}
          style={({ pressed }) => [styles.button, !portalUrl && styles.buttonDisabled, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonLabel}>{portalUrl ? "Manage subscription" : "No subscription yet"}</Text>
        </Pressable>

        <Text style={styles.note}>
          Subscription changes happen in Stripe's customer portal so you stay in control of payment method, invoices, and cancellation.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "—"}</Text>
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
  button: {
    backgroundColor: "#38ffd3",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonPressed: { opacity: 0.85 },
  buttonLabel: { color: "#021416", fontSize: 16, fontWeight: "700" },
  note: { color: "#8a96a8", fontSize: 13, lineHeight: 20, marginTop: 12 },
});
