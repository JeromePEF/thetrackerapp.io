import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/lib/api/client";
import { fetchMeasurements } from "@/lib/api/measurements";
import { fetchStatsRange, last7DaysRange } from "@/lib/api/portal";
import { pickNumber, type Measurement, type StatsRangeResponse } from "@/lib/api/types";
import { useAuth, useContact } from "@/state/auth";

const MEASUREMENT_FIELDS: { key: keyof Measurement; label: string; section: string }[] = [
  { key: "height", label: "Height", section: "Overview" },
  { key: "weight", label: "Weight", section: "Overview" },
  { key: "bodyFat", label: "Body Fat %", section: "Overview" },
  { key: "neck", label: "Neck", section: "Upper Body" },
  { key: "shoulders", label: "Shoulders", section: "Upper Body" },
  { key: "chest", label: "Chest", section: "Upper Body" },
  { key: "leftBicep", label: "Left Bicep", section: "Upper Body" },
  { key: "rightBicep", label: "Right Bicep", section: "Upper Body" },
  { key: "leftForearm", label: "Left Forearm", section: "Upper Body" },
  { key: "rightForearm", label: "Right Forearm", section: "Upper Body" },
  { key: "waist", label: "Waist", section: "Core" },
  { key: "hips", label: "Hips", section: "Core" },
  { key: "leftThigh", label: "Left Thigh", section: "Lower Body" },
  { key: "rightThigh", label: "Right Thigh", section: "Lower Body" },
  { key: "leftCalf", label: "Left Calf", section: "Lower Body" },
  { key: "rightCalf", label: "Right Calf", section: "Lower Body" },
];

export default function StatsScreen() {
  const { signOut } = useAuth();
  const contact = useContact();
  const [data, setData] = useState<StatsRangeResponse | null>(null);
  const [latestMeasurement, setLatestMeasurement] = useState<Measurement | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!contact) return;
    setError(null);
    const range = last7DaysRange();
    try {
      const [stats, measurements] = await Promise.all([
        fetchStatsRange({ contact, from: range.from, to: range.to }),
        fetchMeasurements().catch(() => null),
      ]);
      setData(stats);

      if (measurements?.measurements?.length) {
        setLatestMeasurement(measurements.measurements[0]);
      }
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

  const sections = [...new Set(MEASUREMENT_FIELDS.map((f) => f.section))];

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

        {latestMeasurement ? (
          <>
            <Text style={styles.sectionHeading}>Body measurements</Text>
            {latestMeasurement.date ? (
              <Text style={styles.measurementDate}>
                {new Date(latestMeasurement.date).toLocaleDateString()}
              </Text>
            ) : null}

            {sections.map((section) => {
              const fields = MEASUREMENT_FIELDS.filter((f) => f.section === section);
              const hasValue = fields.some((f) => latestMeasurement[f.key] != null);
              if (!hasValue) return null;
              return (
                <View key={section} style={styles.measurementSection}>
                  <Text style={styles.measurementSectionTitle}>{section}</Text>
                  <View style={styles.measurementGrid}>
                    {fields.map((f) => {
                      const val = latestMeasurement[f.key];
                      if (val == null || val === "") return null;
                      return (
                        <View key={f.key} style={styles.measurementCard}>
                          <Text style={styles.measurementLabel}>{f.label}</Text>
                          <Text style={styles.measurementValue}>{String(val)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </>
        ) : null}
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
  sectionHeading: { color: "#ecf4ff", fontSize: 20, fontWeight: "700", marginTop: 8 },
  measurementDate: { color: "#8a96a8", fontSize: 13, marginTop: -12 },
  measurementSection: { gap: 8 },
  measurementSectionTitle: { color: "#24a7b4", fontSize: 14, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  measurementGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  measurementCard: {
    backgroundColor: "#0a2026",
    borderRadius: 10,
    padding: 12,
    borderColor: "#1f3b44",
    borderWidth: 1,
    minWidth: "30%",
    flex: 1,
    maxWidth: "48%",
  },
  measurementLabel: { color: "#8a96a8", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8 },
  measurementValue: { color: "#ecf4ff", fontSize: 16, fontWeight: "600", marginTop: 4 },
});
