export type Sloka = {
  id: number;
  chapter: number;
  verse_number: number;
  sanskrit_devanagari: string;
  transliteration_iast: string;
  hindi_translation: string;
  english_translation: string;
  english_meaning?: string;
  hindi_meaning?: string;
  word_meanings?: Record<string, string>;
  tags: string[];
};

export type Mood = {
  id: string;
  label: string;
  labelHi: string;
  tags: string[];
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  chartEpigraph?: string;
};

export type Citation = {
  id: number;
  ref: string;
  english: string;
  hindi?: string;
};

export type ChapterMeta = {
  number: number;
  name: string;
  /** Hindi common title (not transliteration of English). */
  name_hi?: string;
  name_sanskrit: string;
  verses_count: number;
  summary: string;
  summary_hi?: string;
  moral?: string;
  moral_hi?: string;
};

export type AstrologyMember = {
  id: string;
  name: string;
  relationship?: string | null;
  dob: string;
  tob?: string | null;
  tobUnknown?: boolean;
  placeLabel?: string | null;
  lat?: number | null;
  lng?: number | null;
  ianaTz?: string | null;
  currentMahaLord?: string | null;
};

export type JournalEntry = {
  id: string;
  sloka_id: number;
  reflection: string;
  created_at: string;
};

export type Streak = {
  current: number;
  longest: number;
  last_active_date?: string | null;
};

export type SadhanaPractice = "flow" | "japa" | "sit" | "pranayama";

/** One device-local practice session awaiting a signed-in merge. */
export type SadhanaLogEntry = {
  practice: SadhanaPractice;
  /** Device-local calendar day, YYYY-MM-DD. */
  occurredOn: string;
  durationSec?: number;
  count?: number;
  /** uuid v4 — the server-side dedupe key; required for merge. */
  clientRef: string;
};

export type PracticeStreak = {
  practice: SadhanaPractice;
  current: number;
  longest: number;
  lastDay?: string | null;
};

export type SadhanaStreak = {
  current: number;
  longest: number;
  graceUsedToday?: boolean;
};

export type Koota = {
  name: string;
  score: number;
  max: number;
  note: string;
};

export type CompatibilityBand =
  | "excellent"
  | "good"
  | "acceptable"
  | "needs-discussion";

export type CompatibilityResult = {
  kootas: Koota[];
  total: number;
  max: number;
  band: CompatibilityBand;
  /** Always present — the count is a starting point, not a verdict. */
  caveat: string;
  nadiDosha: boolean;
};

/** Server daily panchang, computed at local sunrise for its location. */
export type PanchangDay = {
  tithi: string;
  tithiIndex: number;
  nakshatra: string;
  pada: number;
  yoga: string;
  karana: string;
  vaar: string;
  date: string;
  ianaTz: string;
  sunrise: string | null;
  sunset: string | null;
  tithiEndsAt: string | null;
  nakshatraEndsAt: string | null;
  isEkadashi: boolean;
  isPurnima: boolean;
  isAmavasya: boolean;
};
