import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { getSessionId, sendMessage, setSessionId } from "@/lib/api/chat";
import type { ChatMessage } from "@/lib/api/types";
import { useAuth, useContact } from "@/state/auth";

export default function InputScreen() {
  const { signOut } = useAuth();
  const contact = useContact();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const id = getSessionId();
    if (!id) {
      setMessages([
        {
          id: "welcome",
          role: "ai",
          text: "Send a message to update your tracker or ask anything.",
          ts: new Date().toISOString(),
        },
      ]);
    }
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleSend = useCallback(async () => {
    const body = input.trim();
    if (!body || busy) return;
    setInput("");
    setError(null);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: body,
      ts: new Date().toISOString(),
    };
    addMessage(userMsg);
    scrollToEnd();

    setBusy(true);
    try {
      const res = await sendMessage({ message: body, contact: contact ?? undefined });
      if (res.sessionId) setSessionId(res.sessionId);

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: res.mode === "agent" ? "agent" : "ai",
        text: res.reply || "(no response)",
        ts: new Date().toISOString(),
      };
      addMessage(aiMsg);
      scrollToEnd();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await signOut();
        return;
      }
      const errMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: "ai",
        text: err instanceof Error ? err.message : "Failed to send message.",
        ts: new Date().toISOString(),
      };
      addMessage(errMsg);
      setError(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setBusy(false);
    }
  }, [input, busy, contact, signOut, addMessage, scrollToEnd]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]} selectable>
            {item.text}
          </Text>
        </View>
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.bar}>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor="#5b6a7a"
            style={styles.input}
            multiline
            maxLength={1000}
            editable={!busy}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={() => void handleSend()}
            disabled={!input.trim() || busy}
            style={({ pressed }) => [
              styles.sendBtn,
              (!input.trim() || busy) && styles.sendBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#021416" size="small" />
            ) : (
              <Text style={styles.sendBtnText}>Send</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#021416" },
  flex: { flex: 1 },
  list: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  bubbleRow: { flexDirection: "row", justifyContent: "flex-start" },
  bubbleRowUser: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleBot: {
    backgroundColor: "#0a2026",
    borderColor: "#1f3b44",
    borderWidth: 1,
  },
  bubbleUser: { backgroundColor: "#24a7b4" },
  bubbleText: { color: "#ecf4ff", fontSize: 15, lineHeight: 21 },
  bubbleTextUser: { color: "#021416" },
  error: {
    color: "#ff6b6b",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderTopColor: "#1f3b44",
    borderTopWidth: 1,
    backgroundColor: "#021416",
  },
  input: {
    flex: 1,
    backgroundColor: "#0a2026",
    borderColor: "#1f3b44",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#ecf4ff",
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: "#24a7b4",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#021416", fontSize: 14, fontWeight: "700" },
});
