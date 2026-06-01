import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/lib/api/client";
import { verifyLoginCode } from "@/lib/api/auth";
import { useAuth } from "@/state/auth";

export default function VerifyScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{
    method: string;
    identifier: string;
    requestId: string;
    maskedDestination?: string;
    codeLength?: string;
  }>();

  const codeLength = Number(params.codeLength) || 8;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (code.trim().length < codeLength || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await verifyLoginCode({
        method: params.method as "phone" | "email" | "username",
        identifier: params.identifier ?? "",
        requestId: params.requestId ?? "",
        code,
      });
      await signIn({
        token: res.sessionToken,
        expiresAt: res.sessionExpiresAt,
        account: res.account
          ? {
              accountId: res.account.accountId || res.account.id,
              canonical: res.account.canonical,
              username: res.account.username,
              email: res.account.email || res.account.primaryEmail,
            }
          : null,
      });
      router.replace("/(tabs)/stats");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.message}${err.status ? ` (HTTP ${err.status})` : ""}`
          : err instanceof Error
          ? err.message
          : "Invalid code.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>Enter your code</Text>
          <Text style={styles.subtitle}>
            We sent a {codeLength}-character code to {params.maskedDestination || params.identifier}.
          </Text>

          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, codeLength))}
            placeholder={"ABCD1234".slice(0, codeLength)}
            placeholderTextColor="#5b6a7a"
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="default"
            style={styles.input}
            editable={!busy}
            returnKeyType="done"
            onSubmitEditing={submit}
            maxLength={codeLength}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={busy || code.length < codeLength}
            style={({ pressed }) => [
              styles.button,
              (busy || code.length < codeLength) && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            {busy ? <ActivityIndicator color="#021416" /> : <Text style={styles.buttonLabel}>Verify</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#021416" },
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 48, gap: 16 },
  back: { color: "#38ffd3", fontSize: 15 },
  title: { color: "#ecf4ff", fontSize: 32, fontWeight: "700", marginTop: 12 },
  subtitle: { color: "#8a96a8", fontSize: 15, lineHeight: 22, marginBottom: 8 },
  input: {
    backgroundColor: "#0a2026",
    borderColor: "#1f3b44",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#ecf4ff",
    fontSize: 22,
    letterSpacing: 6,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  error: { color: "#ff6b6b", fontSize: 14 },
  button: {
    backgroundColor: "#38ffd3",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonPressed: { opacity: 0.85 },
  buttonLabel: { color: "#021416", fontSize: 16, fontWeight: "700" },
});
