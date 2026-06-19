import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/lib/api/client";
import { fetchGoals, saveGoals } from "@/lib/api/goals";
import type { GoalsResponse } from "@/lib/api/types";
import { useAuth } from "@/state/auth";

export default function GoalsScreen() {
  const { signOut } = useAuth();
  const [goals, setGoals] = useState<GoalsResponse>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusOk, setStatusOk] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchGoals();
      setGoals({
        weightGoal: res.weightGoal || "",
        bodyFatGoal: res.bodyFatGoal || "",
        workoutPlan: res.workoutPlan || "",
        selectedPlanDays: res.selectedPlanDays,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await signOut();
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load goals.");
    }
  }, [signOut]);

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

  const handleSave = useCallback(async () => {
    setSaving(true);
    setStatus(null);
    try {
      await saveGoals(goals);
      setStatus("Goals saved.");
      setStatusOk(true);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed.");
      setStatusOk(false);
    } finally {
      setSaving(false);
    }
  }, [goals]);

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
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl tintColor="#38ffd3" refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.heading}>Goals & Plan</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Field label="Weight goal">
          <TextInput
            value={goals.weightGoal || ""}
            onChangeText={(v) => setGoals((g) => ({ ...g, weightGoal: v }))}
            placeholder="e.g. 185 lbs"
            placeholderTextColor="#5b6a7a"
            style={styles.input}
            keyboardType="default"
            autoCorrect={false}
          />
        </Field>

        <Field label="Body fat goal">
          <TextInput
            value={goals.bodyFatGoal || ""}
            onChangeText={(v) => setGoals((g) => ({ ...g, bodyFatGoal: v }))}
            placeholder="e.g. 12%"
            placeholderTextColor="#5b6a7a"
            style={styles.input}
            keyboardType="default"
            autoCorrect={false}
          />
        </Field>

        <Field label="Workout plan">
          <TextInput
            value={goals.workoutPlan || ""}
            onChangeText={(v) => setGoals((g) => ({ ...g, workoutPlan: v }))}
            placeholder="Describe your training split or plan..."
            placeholderTextColor="#5b6a7a"
            style={[styles.input, styles.textarea]}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </Field>

        {status ? (
          <Text style={[styles.status, statusOk ? styles.statusOk : styles.statusErr]}>{status}</Text>
        ) : null}

        <Pressable
          onPress={() => void handleSave()}
          disabled={saving}
          style={({ pressed }) => [styles.saveBtn, saving && styles.saveBtnDisabled, pressed && { opacity: 0.85 }]}
        >
          {saving ? (
            <ActivityIndicator color="#021416" />
          ) : (
            <Text style={styles.saveBtnText}>Save goals</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#021416" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#021416" },
  content: { paddingHorizontal: 20, paddingVertical: 24, gap: 16 },
  heading: { color: "#ecf4ff", fontSize: 22, fontWeight: "700", marginBottom: 4 },
  error: { color: "#ff6b6b", fontSize: 14 },
  field: {
    backgroundColor: "#0a2026",
    borderRadius: 12,
    padding: 16,
    borderColor: "#1f3b44",
    borderWidth: 1,
    gap: 8,
  },
  fieldLabel: { color: "#8a96a8", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2 },
  input: {
    backgroundColor: "#021416",
    borderColor: "#1f3b44",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#ecf4ff",
    fontSize: 16,
  },
  textarea: { minHeight: 120, textAlignVertical: "top" },
  status: { fontSize: 14, textAlign: "center", paddingHorizontal: 16 },
  statusOk: { color: "#38ffd3" },
  statusErr: { color: "#ff6b6b" },
  saveBtn: {
    backgroundColor: "#24a7b4",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#021416", fontSize: 16, fontWeight: "700" },
});
