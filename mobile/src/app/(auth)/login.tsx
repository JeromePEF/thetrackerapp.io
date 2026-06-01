import { useRouter } from "expo-router";
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
import { requestLoginCode } from "@/lib/api/auth";

export default function LoginScreen() {
  const router = useRouter();
  const [credential, setCredential] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!credential.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await requestLoginCode(credential);
      router.push({
        pathname: "/(auth)/verify",
        params: {
          method: res.method,
          identifier: res.identifier,
          requestId: res.requestId,
          maskedDestination: res.maskedDestination,
          codeLength: String(res.codeLength),
        },
      });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.message}${err.status ? ` (HTTP ${err.status})` : ""}`
          : err instanceof Error
          ? err.message
          : "Something went wrong.";
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
          <Text style={styles.brand}>thetrackerapp</Text>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            Enter the phone, email, or Telegram username you use with the bot. We'll send you an 8-character code.
          </Text>

          <TextInput
            value={credential}
            onChangeText={setCredential}
            placeholder="+1 555 123 4567"
            placeholderTextColor="#5b6a7a"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            style={styles.input}
            editable={!busy}
            returnKeyType="send"
            onSubmitEditing={submit}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={busy || !credential.trim()}
            style={({ pressed }) => [
              styles.button,
              (busy || !credential.trim()) && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            {busy ? <ActivityIndicator color="#021416" /> : <Text style={styles.buttonLabel}>Send code</Text>}
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
  brand: { color: "#38ffd3", fontSize: 14, fontWeight: "600", letterSpacing: 2, textTransform: "uppercase" },
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
    fontSize: 18,
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
