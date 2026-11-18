/**
 * Client-readable mirror of the community kill switches (web parity).
 *
 * Soft-sangha share CTAs are removed until G1/G2/G3 gates pass (private
 * journal only). These helpers stay false for UI so env typos cannot
 * resurrect half-gated community. Keep in step with
 * MindKshetra/lib/kill-switch-public.ts.
 */
const ON_VALUES = new Set(["1", "true", "on", "yes"]);

/** Soft sangha UI stays dark until product re-enables share surfaces. */
const SOFT_SANGHA_UI = false;

function open(raw: string | undefined): boolean {
  if (!SOFT_SANGHA_UI) return false;
  if (raw == null) return false;
  return ON_VALUES.has(raw.trim().toLowerCase());
}

/** Sharing a reflection to a verse page / sangha. */
export function reflectionsOpen(): boolean {
  return open(process.env.EXPO_PUBLIC_COMMUNITY_REFLECTIONS_ENABLED);
}

/** Reporting someone else's reflection. */
export function reportsOpen(): boolean {
  return open(process.env.EXPO_PUBLIC_COMMUNITY_REPORTS_ENABLED);
}
