import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { deleteAccount } from "@/lib/api/auth";
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const onDelete = useCallback(async () => {
    if (confirmText.trim().toUpperCase() !== "DELETE" || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      // Deliberately do not show a success message — sign-out and route to
      // the login screen is the visible confirmation.
      await signOut();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.message}${err.status ? ` (HTTP ${err.status})` : ""}`
          : err instanceof Error
          ? err.message
          : "Could not delete account.";
      setDeleteError(msg);
      setDeleteBusy(false);
    }
  }, [confirmText, deleteBusy, signOut]);

  const openDelete = useCallback(() => {
    Alert.alert(
      "Delete account?",
      "This permanently removes your account, your sessions, and your tracking history. Your Google Sheet stays in your Drive but will be disconnected from us. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            setConfirmText("");
            setDeleteError(null);
            setDeleteOpen(true);
          },
        },
      ],
    );
  }, []);

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

        <Pressable
          onPress={openDelete}
          style={({ pressed }) => [styles.delete, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.deleteLabel}>Delete account</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm deletion</Text>
            <Text style={styles.modalBody}>
              Type <Text style={styles.modalCode}>DELETE</Text> to permanently delete your account, all sessions, and your tracking history.
            </Text>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="DELETE"
              placeholderTextColor="#5b6a7a"
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.modalInput}
              editable={!deleteBusy}
            />
            {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}
            <View style={styles.modalRow}>
              <Pressable
                onPress={() => setDeleteOpen(false)}
                disabled={deleteBusy}
                style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.modalCancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onDelete}
                disabled={confirmText.trim().toUpperCase() !== "DELETE" || deleteBusy}
                style={({ pressed }) => [
                  styles.modalConfirm,
                  (confirmText.trim().toUpperCase() !== "DELETE" || deleteBusy) && styles.modalConfirmDisabled,
                  pressed && { opacity: 0.85 },
                ]}
              >
                {deleteBusy ? (
                  <ActivityIndicator color="#ecf4ff" />
                ) : (
                  <Text style={styles.modalConfirmLabel}>Delete forever</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    borderColor: "#24a7b4",
    borderWidth: 1,
  },
  signOutLabel: { color: "#24a7b4", fontSize: 16, fontWeight: "600" },
  delete: {
    marginTop: 12,
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteLabel: { color: "#ff6b6b", fontSize: 14, fontWeight: "500" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#0a2026",
    borderRadius: 16,
    padding: 24,
    borderColor: "#1f3b44",
    borderWidth: 1,
    width: "100%",
    maxWidth: 420,
    gap: 12,
  },
  modalTitle: { color: "#ecf4ff", fontSize: 20, fontWeight: "700" },
  modalBody: { color: "#8a96a8", fontSize: 14, lineHeight: 20 },
  modalCode: { color: "#ff6b6b", fontFamily: "Menlo", fontWeight: "700" },
  modalInput: {
    backgroundColor: "#021416",
    borderColor: "#1f3b44",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#ecf4ff",
    fontSize: 16,
    letterSpacing: 4,
    textAlign: "center",
    fontFamily: "Menlo",
  },
  modalRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  modalCancel: {
    flex: 1,
    backgroundColor: "#021416",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderColor: "#1f3b44",
    borderWidth: 1,
  },
  modalCancelLabel: { color: "#ecf4ff", fontSize: 15, fontWeight: "600" },
  modalConfirm: {
    flex: 1,
    backgroundColor: "#ff6b6b",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalConfirmDisabled: { opacity: 0.35 },
  modalConfirmLabel: { color: "#021416", fontSize: 15, fontWeight: "700" },
});
