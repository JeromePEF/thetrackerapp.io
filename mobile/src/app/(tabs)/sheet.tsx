import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/lib/api/client";
import { fetchPortal } from "@/lib/api/portal";
import { useAuth, useContact } from "@/state/auth";

export default function SheetScreen() {
  const { signOut } = useAuth();
  const contact = useContact();
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!contact) return;
    setError(null);
    try {
      const portal = await fetchPortal(contact);
      setSheetUrl(portal.profile?.googleSheetUrl || portal.googleSheetUrl || portal.googleSheet || null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await signOut();
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load sheet.");
    }
  }, [contact, signOut]);

  useEffect(() => {
    void (async () => {
      await load();
      setLoading(false);
    })();
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
      <View style={styles.content}>
        <Text style={styles.title}>Your Google Sheet</Text>
        <Text style={styles.subtitle}>
          Every workout, meal, and measurement you log lives in the same Google Sheet. Open it to inspect or edit raw rows.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={() => sheetUrl && void WebBrowser.openBrowserAsync(sheetUrl)}
          disabled={!sheetUrl}
          style={({ pressed }) => [styles.button, !sheetUrl && styles.buttonDisabled, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonLabel}>{sheetUrl ? "Open Sheet" : "No sheet linked yet"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#021416" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#021416" },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 32, gap: 16 },
  title: { color: "#ecf4ff", fontSize: 26, fontWeight: "700" },
  subtitle: { color: "#8a96a8", fontSize: 15, lineHeight: 22 },
  error: { color: "#ff6b6b", fontSize: 14 },
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
});
