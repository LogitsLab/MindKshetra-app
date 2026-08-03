import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";

/**
 * TTL-gated focus refetching.
 *
 * Screens used to refetch on every `useFocusEffect` — each tab switch hit the
 * API again even when the data was seconds old. This hook keeps the same
 * "refresh when the screen regains focus" shape but skips the fetch while the
 * last successful one is fresher than `ttlMs`, unless a write elsewhere bumped
 * the key's version (see `bumpFocusVersion`).
 */

export const DEFAULT_FOCUS_TTL_MS = 60_000;

/**
 * Module-level write counters, keyed by data domain ("progress", "favorites",
 * "journal"). A writer calls `bumpFocusVersion(key)` after a mutation; every
 * hook instance subscribed to that key then refetches on its next focus
 * regardless of TTL.
 */
const versionCounters = new Map<string, number>();

export function bumpFocusVersion(key: string): void {
  versionCounters.set(key, (versionCounters.get(key) ?? 0) + 1);
}

export function getFocusVersion(key: string): number {
  return versionCounters.get(key) ?? 0;
}

export type ShouldRefetchArgs = {
  /** Timestamp (ms) of the last successful fetch, or null if none yet. */
  lastFetchedAt: number | null;
  now: number;
  ttlMs: number;
  /** Version consumed by the last successful fetch (-1 before the first). */
  lastSeenVersion: number;
  currentVersion: number;
};

/** Pure decision core of the hook — extracted so the TTL logic is testable. */
export function shouldRefetch({
  lastFetchedAt,
  now,
  ttlMs,
  lastSeenVersion,
  currentVersion,
}: ShouldRefetchArgs): boolean {
  if (currentVersion !== lastSeenVersion) return true;
  if (lastFetchedAt == null) return true;
  return now - lastFetchedAt >= ttlMs;
}

export type FocusRefreshOptions = {
  ttlMs?: number;
  /** When false the focus effect is inert (e.g. while auth is still loading). */
  enabled?: boolean;
  /**
   * Changing this discards TTL state so the next focus refetches immediately
   * (e.g. `String(isSignedIn)` — sign-in must not serve the guest snapshot).
   */
  resetKey?: string;
};

/**
 * Runs `fetcher` when the screen gains focus, but only if the TTL has elapsed
 * since the last success or `bumpFocusVersion(key)` was called meanwhile.
 *
 * The fetcher receives `isActive()`, which turns false on blur/unmount — use
 * it exactly like the previous `alive` flag before calling setState. A fetcher
 * that rejects leaves the TTL untouched, so the next focus retries.
 */
export function useFocusRefresh(
  key: string,
  fetcher: (isActive: () => boolean) => void | Promise<unknown>,
  options: FocusRefreshOptions = {}
): void {
  const { ttlMs = DEFAULT_FOCUS_TTL_MS, enabled = true, resetKey } = options;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const lastFetchedAtRef = useRef<number | null>(null);
  const lastSeenVersionRef = useRef(-1);

  const stamp = `${key}\u{1F}${resetKey ?? ""}`;
  const prevStampRef = useRef(stamp);
  if (prevStampRef.current !== stamp) {
    prevStampRef.current = stamp;
    lastFetchedAtRef.current = null;
    lastSeenVersionRef.current = -1;
  }

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      const currentVersion = getFocusVersion(key);
      const refetch = shouldRefetch({
        lastFetchedAt: lastFetchedAtRef.current,
        now: Date.now(),
        ttlMs,
        lastSeenVersion: lastSeenVersionRef.current,
        currentVersion,
      });
      if (!refetch) return;

      let active = true;
      const isActive = () => active;
      Promise.resolve()
        .then(() => fetcherRef.current(isActive))
        .then(() => {
          lastFetchedAtRef.current = Date.now();
          lastSeenVersionRef.current = currentVersion;
        })
        .catch(() => {
          // Failure leaves lastFetchedAt/lastSeenVersion untouched: the next
          // focus retries instead of serving a 60s-long error state.
        });
      return () => {
        active = false;
      };
    }, [key, ttlMs, enabled, stamp])
  );
}
