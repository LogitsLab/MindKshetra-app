/**
 * uuid v4 for practice-log clientRef idempotency keys.
 *
 * Global `crypto` comes from Expo's winter runtime (backed by expo-crypto,
 * already in the binary via expo-auth-session). Math.random is not acceptable
 * here: clientRef is the server-side dedupe key, so a collision silently
 * swallows someone's session.
 */
export function uuidv4(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // randomUUID missing (non-secure web context) — RFC 4122 v4 from raw bytes.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
