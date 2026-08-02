import { AppState } from "react-native";
import { fetch as expoFetch } from "expo/fetch";
import { supabase, supabaseConfigured } from "@/auth/supabase";

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://mind.logitslab.com").replace(
  /\/$/,
  ""
);

export function getApiUrl(): string {
  return API_URL;
}

/**
 * An absolute link to a web page of the same deployment — /support, /care and
 * the other surfaces mobile hands off to rather than reimplementing.
 *
 * These were three hardcoded https://mind.logitslab.com/support constants, so
 * a build pointed at the dev backend still sent people to production. The API
 * and the site are one origin; both follow EXPO_PUBLIC_API_URL.
 */
export function siteUrl(path: string): string {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** The same link without its scheme, for showing rather than opening. */
export function siteLabel(path: string): string {
  return siteUrl(path).replace(/^https?:\/\//, "");
}

function isBackgroundNetworkKill(e: unknown): boolean {
  if ((e as Error)?.name === "AbortError") return true;
  const msg = (e as Error)?.message ?? "";
  if (!/aborted|network connection was lost/i.test(msg)) return false;
  // iOS tears down fetch when the app backgrounds — not a user-facing failure.
  return AppState.currentState !== "active";
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (!supabaseConfigured) return headers;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // A broken auth store must not take content endpoints down with it —
    // fall through to an unauthenticated request instead.
  }
  return headers;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = {
    ...(await authHeaders()),
    ...(init.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error ?? body.message ?? message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type SseHandlers = {
  onSession?: (sessionId: string) => void;
  onCitations?: (citations: unknown[]) => void;
  onToken?: (token: string) => void;
  onReplace?: (content: string) => void;
  onDone?: (payload?: unknown) => void;
  onError?: (message: string) => void;
  onChartEpigraph?: (text: string) => void;
};

/**
 * Dispatch a single SSE block (the text between two blank lines) to handlers.
 *
 * Extracted unchanged from the previous buffered implementation so the transport
 * fix does not quietly alter parsing semantics.
 */
export function dispatchSseBlock(block: string, handlers: SseHandlers): void {
  const lines = block.split("\n");
  let event = "message";
  let data = "";
  for (const line of lines) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data += line.slice(5).trim();
  }
  if (!data) return;
  try {
    const parsed = JSON.parse(data);
    // API sends `{ type, ... }` without `event:` lines; prefer explicit event when present.
    const kind =
      event !== "message" ? event : typeof parsed.type === "string" ? parsed.type : "message";
    switch (kind) {
      case "session":
        handlers.onSession?.(parsed.sessionId ?? parsed.id ?? parsed);
        break;
      case "citations":
        handlers.onCitations?.(parsed.citations ?? parsed);
        break;
      case "token":
        handlers.onToken?.(parsed.token ?? parsed.content ?? "");
        break;
      case "replace":
        handlers.onReplace?.(parsed.content ?? parsed.text ?? "");
        break;
      case "reading":
      case "chart":
      case "chartContext":
      case "epigraph":
        handlers.onChartEpigraph?.(parsed.text ?? parsed.content ?? "");
        break;
      case "done":
        handlers.onDone?.(parsed);
        break;
      case "error":
        handlers.onError?.(parsed.error ?? parsed.message ?? "Chat error");
        break;
      default:
        if (parsed.token) handlers.onToken?.(parsed.token);
        else if (parsed.content && !parsed.type) handlers.onToken?.(parsed.content);
        break;
    }
  } catch {
    if (event === "token") handlers.onToken?.(data);
  }
}

function networkMessage(e: unknown): string {
  const msg = (e as Error)?.message;
  if (!msg || /network request failed/i.test(msg)) {
    return "Could not reach Madhav. Check your connection and try again.";
  }
  if (/network connection was lost/i.test(msg)) {
    return "The network connection was lost.";
  }
  return msg;
}

/**
 * Stream SSE from POST /api/chat.
 *
 * Uses `expo/fetch` rather than the global fetch: React Native's fetch is
 * XHR-backed and never exposes `response.body`, so the previous implementation
 * had to `await res.text()` and only fired onToken once the whole reply had
 * landed. Chat looked frozen for the full model latency. See /autoplan finding F2.
 *
 * Falls back to the buffered path if streaming is unavailable at runtime, so a
 * missing ReadableStream or TextDecoder degrades to the old behavior instead of
 * throwing.
 */
export async function streamChat(
  body: Record<string, unknown>,
  handlers: SseHandlers,
  signal?: AbortSignal
): Promise<void> {
  const headers = await authHeaders();

  let res: Awaited<ReturnType<typeof expoFetch>>;
  try {
    res = await expoFetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { ...headers, Accept: "text/event-stream" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (isBackgroundNetworkKill(e)) return;
    handlers.onError?.(networkMessage(e));
    return;
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const err = await res.json();
      message = err.error ?? message;
    } catch {
      /* ignore */
    }
    handlers.onError?.(message);
    return;
  }

  const stream = res.body;

  if (!stream || typeof stream.getReader !== "function" || typeof TextDecoder === "undefined") {
    try {
      const text = await res.text();
      for (const block of text.split("\n\n")) dispatchSseBlock(block, handlers);
    } catch (e) {
      if (!isBackgroundNetworkKill(e)) handlers.onError?.(networkMessage(e));
    }
    return;
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // stream: true keeps multi-byte sequences intact across chunk boundaries,
      // which matters because Devanagari is 3 bytes per character.
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        dispatchSseBlock(buffer.slice(0, idx), handlers);
        buffer = buffer.slice(idx + 2);
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) dispatchSseBlock(buffer, handlers);
  } catch (e) {
    if (isBackgroundNetworkKill(e)) return;
    handlers.onError?.(networkMessage(e));
  }
}
