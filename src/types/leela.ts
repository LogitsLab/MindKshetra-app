/**
 * Krishna Leela catalog types.
 * Distinct from Gita `ChapterMeta` / verse progress.
 */

/** A single freely readable story inside a chapter. */
export type LeelaStory = {
  id: string;
  chapterId: string;
  /** Order within its chapter (1-based). */
  order: number;
  title: string;
  teaser: string;
  readingTimeMinutes: number;
  source: string;
  sourceReference: string;
  characters: string[];
  theme: string;
  /** Full narrative body. */
  content: string;
  lesson: string;
  closingThought: string;
  traditionNote?: string | null;
  /** Key into `src/theme/leelaArt` — curated stills, not remote URLs. */
  artwork?: string | null;
};

/** One of the seven Leela arcs (browseable chapter, not a locked journey). */
export type LeelaChapter = {
  id: string;
  order: number;
  title: string;
  /** Short poetic line under the chapter title (hero). */
  subtitle: string;
  location: string;
  /** 2–4 line chapter framing — not full narrative. */
  introduction: string;
  /** Key into `src/theme/leelaArt`. */
  artwork?: string | null;
  stories: LeelaStory[];
};

/**
 * Reading progress shape for future persistence (AsyncStorage / API).
 * No storage wired yet.
 */
export type LeelaProgress = {
  completedStoryIds: string[];
  lastOpenedStoryId: string | null;
  /** Optional map of storyId → ISO timestamp when marked complete. */
  completedAt?: Record<string, string>;
};

/** Bundled catalog file shape. */
export type LeelaCatalog = {
  chapters: LeelaChapter[];
};

/** Result of resolving `/leela/[id]` against the catalog. */
export type LeelaRouteTarget =
  | { kind: "chapter"; chapter: LeelaChapter }
  | { kind: "story"; story: LeelaStory }
  | { kind: "missing" };
