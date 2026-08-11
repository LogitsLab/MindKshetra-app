import catalogData from "@/data/leelas.json";
import type {
  LeelaCatalog,
  LeelaChapter,
  LeelaProgress,
  LeelaRouteTarget,
  LeelaStory,
} from "@/types/leela";

export type {
  LeelaCatalog,
  LeelaChapter,
  LeelaProgress,
  LeelaRouteTarget,
  LeelaStory,
} from "@/types/leela";

/**
 * Bundled Krishna Leela catalog.
 *
 * Master import contract — replace `leelas.json` with:
 * `{ "chapters": LeelaChapter[] }` where each chapter has
 * id, order, title, subtitle, location, introduction, optional artwork,
 * and `stories: LeelaStory[]`. Each story has id, chapterId, order, title,
 * teaser, readingTimeMinutes, source, sourceReference, characters, theme,
 * content, lesson, closingThought, optional traditionNote, optional artwork.
 * Run `validateLeelaCatalog` from `leelaValidation.ts` before shipping.
 */
const catalog = catalogData as LeelaCatalog;

function byOrder<T extends { order: number }>(a: T, b: T): number {
  return a.order - b.order;
}

/** Empty progress seed for future persistence. */
export function emptyLeelaProgress(): LeelaProgress {
  return {
    completedStoryIds: [],
    lastOpenedStoryId: null,
    completedAt: {},
  };
}

export function getAllLeelaChapters(): LeelaChapter[] {
  return [...catalog.chapters]
    .map((chapter) => ({
      ...chapter,
      stories: [...chapter.stories].sort(byOrder),
    }))
    .sort(byOrder);
}

export function getLeelaChapterById(id: string): LeelaChapter | null {
  if (!id) return null;
  const chapter = catalog.chapters.find((c) => c.id === id);
  if (!chapter) return null;
  return {
    ...chapter,
    stories: [...chapter.stories].sort(byOrder),
  };
}

/** Flat catalog order: chapter order, then story order within each chapter. */
export function getAllLeelaStories(): LeelaStory[] {
  const stories: LeelaStory[] = [];
  for (const chapter of getAllLeelaChapters()) {
    stories.push(...chapter.stories);
  }
  return stories;
}

export function getLeelaStoriesByChapterId(chapterId: string): LeelaStory[] {
  if (!chapterId) return [];
  const chapter = getLeelaChapterById(chapterId);
  return chapter ? chapter.stories : [];
}

export function getLeelaStoryById(id: string): LeelaStory | null {
  if (!id) return null;
  for (const chapter of catalog.chapters) {
    const story = chapter.stories.find((s) => s.id === id);
    if (story) return story;
  }
  return null;
}

export function getNextLeelaStory(storyId: string): LeelaStory | null {
  const ordered = getAllLeelaStories();
  const index = ordered.findIndex((s) => s.id === storyId);
  if (index < 0 || index >= ordered.length - 1) return null;
  return ordered[index + 1] ?? null;
}

export function getPreviousLeelaStory(storyId: string): LeelaStory | null {
  const ordered = getAllLeelaStories();
  const index = ordered.findIndex((s) => s.id === storyId);
  if (index <= 0) return null;
  return ordered[index - 1] ?? null;
}

/**
 * Story for the Hub "Continue Reading" band.
 * Until persistence ships: last opened if valid, otherwise the first catalog story.
 */
export function getContinueLeelaStory(
  progress: LeelaProgress = emptyLeelaProgress()
): LeelaStory | null {
  if (progress.lastOpenedStoryId) {
    const last = getLeelaStoryById(progress.lastOpenedStoryId);
    if (last) return last;
  }
  return getAllLeelaStories()[0] ?? null;
}

/**
 * Resolve `/leela/[id]` — chapter ids win over story ids if both ever collide
 * (they should not; chapter and story id namespaces stay distinct).
 */
export function resolveLeelaRoute(id: string): LeelaRouteTarget {
  if (!id) return { kind: "missing" };
  const chapter = getLeelaChapterById(id);
  if (chapter) return { kind: "chapter", chapter };
  const story = getLeelaStoryById(id);
  if (story) return { kind: "story", story };
  return { kind: "missing" };
}

/**
 * Split story body into paragraphs for long-form reading.
 * Blank lines (`\\n\\n`) separate paragraphs; single newlines collapse to spaces
 * within a paragraph. Empty input → [].
 */
export function splitLeelaParagraphs(content: string): string[] {
  if (!content?.trim()) return [];
  return content
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}
