import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/lib/api/client";
import { fetchLeaderboardRank, fetchSiteLeaderboard } from "@/lib/api/leaderboard";
import type { LeaderboardEntry } from "@/lib/api/types";
import { useAuth, useContact } from "@/state/auth";

type Category = "strength" | "calisthenics" | "streaks";

export default function LeaderboardScreen() {
  const { signOut } = useAuth();
  const contact = useContact();
  const [rank, setRank] = useState<number | null>(null);
  const [category, setCategory] = useState<Category>("strength");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (contact) {
        const rankRes = await fetchLeaderboardRank(contact);
        const r = rankRes.rank ?? rankRes.leaderboardRank ?? rankRes.position;
        if (rankRes.data && typeof rankRes.data === "object") {
          setRank(rankRes.data.rank ?? rankRes.data.leaderboardRank ?? rankRes.data.position ?? null);
        } else if (typeof r === "number") {
          setRank(r);
        }
      }

      const board = await fetchSiteLeaderboard(category);
      let list: LeaderboardEntry[] = [];
      if (category === "strength") {
        list = board.strength || board.entries || [];
      } else if (category === "calisthenics") {
        list = board.calisthenics || board.entries || [];
      } else {
        list = board.streaks || board.entries || [];
      }
      setEntries(list.slice(0, 20));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await signOut();
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load leaderboard.");
    }
  }, [contact, category, signOut]);

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

  const cats: { key: Category; label: string }[] = [
    { key: "strength", label: "Strength" },
    { key: "calisthenics", label: "Calisthenics" },
    { key: "streaks", label: "Streaks" },
  ];

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl tintColor="#38ffd3" refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.heading}>Leaderboard</Text>

        {rank !== null ? (
          <View style={styles.rankCard}>
            <Text style={styles.rankLabel}>Your rank</Text>
            <Text style={styles.rankValue}>#{rank}</Text>
          </View>
        ) : null}

        <View style={styles.tabs}>
          {cats.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => {
                setCategory(c.key);
                setLoading(true);
                setEntries([]);
                void load().then(() => setLoading(false));
              }}
              style={({ pressed }) => [
                styles.tab,
                category === c.key && styles.tabActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.tabText, category === c.key && styles.tabTextActive]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : entries.length === 0 ? (
          <Text style={styles.empty}>No leaderboard data yet.</Text>
        ) : (
          entries.map((entry, i) => {
            const name = entry.name || entry.canonical || "—";
            const value = entry.value || entry.score || "—";
            const exercise = entry.exercise || "";
            return (
              <View key={i} style={styles.row}>
                <Text style={styles.rowRank}>#{entry.rank || i + 1}</Text>
                <View style={styles.rowBody}>
                  <Text style={styles.rowName}>{String(name)}</Text>
                  {exercise ? <Text style={styles.rowExercise}>{String(exercise)}</Text> : null}
                </View>
                <Text style={styles.rowValue}>{String(value)}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#021416" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#021416" },
  content: { paddingHorizontal: 20, paddingVertical: 24, gap: 12 },
  heading: { color: "#ecf4ff", fontSize: 22, fontWeight: "700", marginBottom: 4 },
  error: { color: "#ff6b6b", fontSize: 14 },
  empty: { color: "#5b6a7a", fontSize: 14, textAlign: "center", marginTop: 20 },
  rankCard: {
    backgroundColor: "#0a2026",
    borderRadius: 16,
    padding: 20,
    borderColor: "#24a7b4",
    borderWidth: 1,
    alignItems: "center",
  },
  rankLabel: { color: "#8a96a8", fontSize: 13, textTransform: "uppercase", letterSpacing: 1.2 },
  rankValue: { color: "#38ffd3", fontSize: 48, fontWeight: "700", marginTop: 4 },
  tabs: { flexDirection: "row", gap: 8, marginTop: 4 },
  tab: {
    flex: 1,
    backgroundColor: "#0a2026",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderColor: "#1f3b44",
    borderWidth: 1,
  },
  tabActive: { borderColor: "#24a7b4", backgroundColor: "#0d2e35" },
  tabText: { color: "#8a96a8", fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#24a7b4" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a2026",
    borderRadius: 12,
    padding: 14,
    borderColor: "#1f3b44",
    borderWidth: 1,
    gap: 10,
  },
  rowRank: { color: "#38ffd3", fontSize: 14, fontWeight: "700", fontFamily: "Menlo", width: 36 },
  rowBody: { flex: 1 },
  rowName: { color: "#ecf4ff", fontSize: 15, fontWeight: "600" },
  rowExercise: { color: "#8a96a8", fontSize: 12, marginTop: 2 },
  rowValue: { color: "#24a7b4", fontSize: 15, fontWeight: "700", fontFamily: "Menlo" },
});
