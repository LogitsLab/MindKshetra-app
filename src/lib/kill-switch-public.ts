/**
 * Client-readable mirror of the community kill switches (web parity).
 *
 * Same fail-safe as the server and Next.js public mirror: unset or
 * unrecognised means PAUSED. Never default these on — an invitation the API
 * will refuse (503) is worse than silence.
 *
 * Keep in step with MindKshetra/lib/kill-switch-public.ts and the server
 * COMMUNITY_*_ENABLED vars. App builds read EXPO_PUBLIC_* equivalents.
 */
const ON_VALUES = new Set(["1", "true", "on", "yes"]);

function open(raw: string | undefined): boolean {
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
