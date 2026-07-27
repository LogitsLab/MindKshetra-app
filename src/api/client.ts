import { supabase, supabaseConfigured } from "@/auth/supabase";

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://mindkshetra.app").replace(
  /\/$/,
  ""
);

export function getApiUrl(): string {
  return API_URL;
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (!supabaseConfigured) return headers;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
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

/** Parse SSE from POST /api/chat */
export async function streamChat(
  body: Record<string, unknown>,
  handlers: SseHandlers,
  signal?: AbortSignal
): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

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

  const text = await res.text();
  const blocks = text.split("\n\n");
  for (const block of blocks) {
    const lines = block.split("\n");
    let event = "message";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    if (!data) continue;
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
}
