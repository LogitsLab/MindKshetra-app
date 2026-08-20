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

/**
 * In-memory access token cache.
 *
 * Every request used to await `supabase.auth.getSession()` — an AsyncStorage
 * read on the hot path of each API call. The token is now cached in memory,
 * kept warm by `onAuthStateChange` (sign-in, sign-out, background refresh),
 * and only re-read from the session store when the cached copy is within
 * `TOKEN_EXPIRY_MARGIN_S` of expiring or its expiry is unknown.
 */
let cachedAccessToken: string | null = null;
/** Epoch seconds; 0 means unknown, which always falls back to getSession(). */
let cachedTokenExpiresAt = 0;

const TOKEN_EXPIRY_MARGIN_S = 60;

let authListenerRegistered = false;

function ensureAuthListener(): void {
  if (authListenerRegistered || !supabaseConfigured) return;
  authListenerRegistered = true;
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedAccessToken = session?.access_token ?? null;
    cachedTokenExpiresAt = session?.expires_at ?? 0;
  });
}

function invalidateAccessToken(): void {
  cachedAccessToken = null;
  cachedTokenExpiresAt = 0;
}

async function getAccessToken(): Promise<string | null> {
  if (!supabaseConfigured) return null;
  ensureAuthListener();
  const nowS = Date.now() / 1000;
  if (cachedAccessToken && cachedTokenExpiresAt - nowS > TOKEN_EXPIRY_MARGIN_S) {
    return cachedAccessToken;
  }
  try {
    const { data } = await supabase.auth.getSession();
    cachedAccessToken = data.session?.access_token ?? null;
    cachedTokenExpiresAt = data.session?.expires_at ?? 0;
  } catch {
    // A broken auth store must not take content endpoints down with it —
    // fall through to an unauthenticated request instead.
    return null;
  }
  return cachedAccessToken;
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const token = await getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
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
  const request = async () => {
    const headers = {
      ...(await authHeaders()),
      ...(init.headers as Record<string, string> | undefined),
    };
    return {
      res: await fetch(`${API_URL}${path}`, { ...init, headers }),
      hadAuth: Boolean(headers.Authorization),
    };
  };

  let { res, hadAuth } = await request();
  if (res.status === 401 && hadAuth) {
    // The cached token can outlive its session (revocation, clock drift).
    // Re-read the session once and retry; a second 401 surfaces normally.
    invalidateAccessToken();
    ({ res } = await request());
  }
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
};

export type ChatRequestMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBase = {
  language: "en" | "hi";
  sessionId?: string;
  chatSessionId?: string;
  messages: ChatRequestMessage[];
};

export type ChatRequestContext =
  | {
      slokaId: number;
    }
  | {
      slokaId?: undefined;
    };

export type ChatRequestBody = ChatRequestBase & ChatRequestContext;

export type ChatRequestInput = {
  language: "en" | "hi";
  sessionId?: string | null;
  messages: ChatRequestMessage[];
  slokaId?: number | null;
};

/**
 * Build the chat payload at one boundary. Verse context is optional and exclusive.
 */
export function buildChatRequestBody(input: ChatRequestInput): ChatRequestBody {
  const base: ChatRequestBase = {
    language: input.language,
    sessionId: input.sessionId ?? undefined,
    chatSessionId: input.sessionId ?? undefined,
    messages: input.messages,
  };

  if (input.slokaId != null) return { ...base, slokaId: input.slokaId };
  return base;
}

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
  body: ChatRequestBody,
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
