import plainWordsData from "@/data/plain-words.json";

type Entry = { en: string; hi: string };

const table = plainWordsData as Record<string, Entry | string>;

export function plainWordsFor(
  chapter: number,
  verse: number,
  lang: "en" | "hi"
): string {
  const entry = table[`${chapter}-${verse}`];
  if (!entry || typeof entry === "string") return "";
  if (lang === "hi") return entry.hi?.trim() || entry.en?.trim() || "";
  return entry.en?.trim() || entry.hi?.trim() || "";
}
