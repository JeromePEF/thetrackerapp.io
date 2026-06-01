import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/lib/api/client";
import { fetchStatsRange, last7DaysRange } from "@/lib/api/portal";
import { pickNumber, type StatsRangeResponse } from "@/lib/api/types";
import { useAuth, useContact } from "@/state/auth";

export default function StatsScreen() {
  const { signOut } = useAuth();
  const contact = useContact();
  const [data, setData] = useState<StatsRangeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!contact) return;
    setError(null);
    const range = last7DaysRange();
    try {
      const res = await fetchStatsRange({ contact, from: range.from, to: range.to });
      setData(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await signOut();
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load stats.");
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

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl tintColor="#38ffd3" refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.heading}>Last 7 days</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Stat label="Workouts" value={pickNumber(data?.workoutsLogged)} unit="" />
        <Stat label="Calories" value={pickNumber(data?.caloriesTracked)} unit="kcal" />
        <Stat label="Water" value={pickNumber(data?.gallonsDrank)} unit="gal" />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>
        {value.toLocaleString()} {unit ? <Text style={styles.cardUnit}>{unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#021416" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#021416" },
  content: { paddingHorizontal: 20, paddingVertical: 24, gap: 16 },
  heading: { color: "#ecf4ff", fontSize: 22, fontWeight: "700", marginBottom: 4 },
  error: { color: "#ff6b6b", fontSize: 14 },
  card: {
    backgroundColor: "#0a2026",
    borderRadius: 16,
    padding: 20,
    borderColor: "#1f3b44",
    borderWidth: 1,
  },
  cardLabel: { color: "#8a96a8", fontSize: 13, textTransform: "uppercase", letterSpacing: 1.2 },
  cardValue: { color: "#ecf4ff", fontSize: 36, fontWeight: "700", marginTop: 8 },
  cardUnit: { color: "#24a7b4", fontSize: 18, fontWeight: "500" },
});
