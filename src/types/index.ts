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
