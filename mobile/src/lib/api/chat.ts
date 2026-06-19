import { api } from "./client";
import type { ChatMessageResponse, ChatPollResponse } from "./types";

let _sessionId: string | null = null;

export function getSessionId(): string | null {
  return _sessionId;
}

export function setSessionId(id: string | null) {
  _sessionId = id;
}

export function sendMessage(args: { message: string; contact?: string }) {
  return api<ChatMessageResponse>("/api/chat/message", {
    method: "POST",
    body: {
      sessionId: _sessionId || "",
      message: args.message,
      contact: args.contact || undefined,
      context: { page: "mobile-input", url: "app://input" },
    },
  });
}

export function requestAgent(args: { contact?: string; reason?: string }) {
  return api<ChatMessageResponse>("/api/chat/request-agent", {
    method: "POST",
    body: {
      sessionId: _sessionId || "",
      contact: args.contact || undefined,
      reason: args.reason || undefined,
    },
  });
}

export function pollMessages(since?: string) {
  const query: Record<string, string> = {};
  if (_sessionId) query.sessionId = _sessionId;
  if (since) query.since = since;
  return api<ChatPollResponse>("/api/chat/messages", { query });
}
