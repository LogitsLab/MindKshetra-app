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

export type JournalEntry = {
  id: string;
  sloka_id: number | null;
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
