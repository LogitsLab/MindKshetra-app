import * as Crypto from "expo-crypto";

/**
 * uuid v4 for practice-log clientRef idempotency keys.
 *
 * Global `crypto` does NOT exist in Hermes release builds — the previous
 * implementation referenced it bare, which threw
 * "ReferenceError: Property 'crypto' doesn't exist" and fatally crashed
 * Japa on open (useRef initializer) and Sadhana/Meditation on completion,
 * on both platforms. expo-crypto is the reliable native source; the
 * globalThis probe keeps web/newer runtimes on the built-in.
 *
 * Math.random is still not acceptable here: clientRef is the server-side
 * dedupe key, so a collision silently swallows someone's session.
 */
export function uuidv4(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (typeof g.crypto?.randomUUID === "function") {
    return g.crypto.randomUUID();
  }
  return Crypto.randomUUID();
}
