/**
 * Pure state + payload helpers for the shared birth-details form.
 *
 * Kept free of React Native imports so the API contract (what a birth payload
 * looks like, when it is complete) is unit-testable in a node environment.
 */

export type GeoPlace = {
  label: string;
  lat: number;
  lng: number;
  ianaTz: string;
  /** Present when the geocoder resolves a historical offset; passed through. */
  utcOffsetMinutes?: number;
};

export type BirthDetails = {
  /** YYYY-MM-DD, or null until a date is chosen. */
  dob: string | null;
  /**
   * HH:MM. Retained even while `tobUnknown` is on, so toggling the switch
   * back restores the previously picked time instead of resetting it.
   */
  tob: string;
  tobUnknown: boolean;
  place: GeoPlace | null;
};

export const DEFAULT_TOB = "12:00";

export const emptyBirthDetails: BirthDetails = {
  dob: null,
  tob: DEFAULT_TOB,
  tobUnknown: false,
  place: null,
};

const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;
const TOB_RE = /^\d{2}:\d{2}$/;

export function hasValidDob(details: BirthDetails): boolean {
  return Boolean(details.dob && DOB_RE.test(details.dob));
}

export function isCompleteBirthDetails(details: BirthDetails): boolean {
  if (!hasValidDob(details)) return false;
  if (!details.place) return false;
  if (!details.tobUnknown && !TOB_RE.test(details.tob)) return false;
  return true;
}

/**
 * The birth body both astrology endpoints accept. `tobUnknown` is real here:
 * when the switch is on we send `tob: null, tobUnknown: true` rather than the
 * old hardcoded `tobUnknown: false`, which silently produced noon charts.
 */
export function birthPayloadFromDetails(
  details: BirthDetails
): Record<string, unknown> | null {
  if (!isCompleteBirthDetails(details) || !details.place || !details.dob) {
    return null;
  }
  return {
    dob: details.dob,
    tob: details.tobUnknown ? null : details.tob,
    tobUnknown: details.tobUnknown,
    placeLabel: details.place.label,
    lat: details.place.lat,
    lng: details.place.lng,
    ianaTz: details.place.ianaTz,
    ...(details.place.utcOffsetMinutes != null
      ? { utcOffsetMinutes: details.place.utcOffsetMinutes }
      : {}),
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local-noon Date for a stored dob — noon keeps the calendar day stable. */
export function dateFromDob(dob: string | null): Date {
  if (dob && DOB_RE.test(dob)) {
    const [y, m, d] = dob.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }
  return new Date(1990, 0, 1, 12, 0, 0);
}

export function dobFromDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Fixed civil day so time never interacts with "today" + date maximumDate. */
const TOB_ANCHOR = { y: 2000, m: 0, d: 1 } as const;

export function dateFromTob(tob: string): Date {
  if (TOB_RE.test(tob)) {
    const [h, m] = tob.split(":").map(Number);
    return new Date(TOB_ANCHOR.y, TOB_ANCHOR.m, TOB_ANCHOR.d, h, m, 0);
  }
  return new Date(TOB_ANCHOR.y, TOB_ANCHOR.m, TOB_ANCHOR.d, 12, 0, 0);
}

export function tobFromDate(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Human date for display; falls back to the ISO string if Intl is limited. */
export function formatDobDisplay(dob: string, lang: "en" | "hi"): string {
  try {
    return dateFromDob(dob).toLocaleDateString(
      lang === "hi" ? "hi-IN" : "en-IN",
      { day: "numeric", month: "long", year: "numeric" }
    );
  } catch {
    return dob;
  }
}
