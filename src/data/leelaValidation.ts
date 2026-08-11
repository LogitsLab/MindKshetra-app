import type { LeelaCatalog, LeelaChapter, LeelaStory } from "@/types/leela";
import {
  EXPECTED_LEELA_CHAPTER_COUNT,
  EXPECTED_LEELA_CHAPTER_TITLES,
  isLeelaArtworkKey,
} from "@/theme/leelaArtworkKeys";

export type LeelaValidationIssue = {
  code: string;
  message: string;
  path?: string;
};

function issue(
  code: string,
  message: string,
  path?: string
): LeelaValidationIssue {
  return path ? { code, message, path } : { code, message };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalArtwork(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function validateArtworkField(
  value: unknown,
  path: string,
  issues: LeelaValidationIssue[]
): void {
  if (value === undefined || value === null || value === "") return;
  if (typeof value !== "string") {
    issues.push(issue("invalid_artwork", "artwork must be a string or null", path));
    return;
  }
  if (!isLeelaArtworkKey(value)) {
    issues.push(
      issue(
        "unknown_artwork",
        `artwork "${value}" is not registered in leelaArtworkKeys`,
        path
      )
    );
  }
}

function validateChapterShape(
  chapter: LeelaChapter,
  index: number,
  issues: LeelaValidationIssue[]
): void {
  const path = `chapters[${index}]`;
  if (!isNonEmptyString(chapter?.id)) {
    issues.push(issue("missing_field", "chapter.id is required", `${path}.id`));
  }
  if (typeof chapter?.order !== "number" || !Number.isFinite(chapter.order)) {
    issues.push(
      issue("missing_field", "chapter.order must be a number", `${path}.order`)
    );
  }
  if (!isNonEmptyString(chapter?.title)) {
    issues.push(
      issue("missing_field", "chapter.title is required", `${path}.title`)
    );
  }
  if (!isNonEmptyString(chapter?.subtitle)) {
    issues.push(
      issue("missing_field", "chapter.subtitle is required", `${path}.subtitle`)
    );
  }
  if (!isNonEmptyString(chapter?.location)) {
    issues.push(
      issue("missing_field", "chapter.location is required", `${path}.location`)
    );
  }
  if (!isNonEmptyString(chapter?.introduction)) {
    issues.push(
      issue(
        "missing_field",
        "chapter.introduction is required",
        `${path}.introduction`
      )
    );
  }
  if (!Array.isArray(chapter?.stories)) {
    issues.push(
      issue("missing_field", "chapter.stories must be an array", `${path}.stories`)
    );
  }
  if (!isOptionalArtwork(chapter?.artwork)) {
    issues.push(
      issue("invalid_artwork", "chapter.artwork must be a string or null", `${path}.artwork`)
    );
  } else {
    validateArtworkField(chapter.artwork, `${path}.artwork`, issues);
  }
}

function validateStoryShape(
  story: LeelaStory,
  path: string,
  parentChapterId: string,
  issues: LeelaValidationIssue[]
): void {
  if (!isNonEmptyString(story?.id)) {
    issues.push(issue("missing_field", "story.id is required", `${path}.id`));
  }
  if (!isNonEmptyString(story?.chapterId)) {
    issues.push(
      issue("missing_field", "story.chapterId is required", `${path}.chapterId`)
    );
  } else if (story.chapterId !== parentChapterId) {
    issues.push(
      issue(
        "invalid_chapter_id",
        `story.chapterId "${story.chapterId}" does not match parent chapter "${parentChapterId}"`,
        `${path}.chapterId`
      )
    );
  }
  if (typeof story?.order !== "number" || !Number.isFinite(story.order)) {
    issues.push(
      issue("missing_field", "story.order must be a number", `${path}.order`)
    );
  }
  if (!isNonEmptyString(story?.title)) {
    issues.push(issue("missing_field", "story.title is required", `${path}.title`));
  }
  if (!isNonEmptyString(story?.teaser)) {
    issues.push(
      issue("missing_field", "story.teaser is required", `${path}.teaser`)
    );
  }
  if (
    typeof story?.readingTimeMinutes !== "number" ||
    !Number.isFinite(story.readingTimeMinutes) ||
    story.readingTimeMinutes <= 0
  ) {
    issues.push(
      issue(
        "invalid_reading_time",
        "readingTimeMinutes must be a finite number greater than 0",
        `${path}.readingTimeMinutes`
      )
    );
  }
  if (!isNonEmptyString(story?.source)) {
    issues.push(
      issue("missing_field", "story.source is required", `${path}.source`)
    );
  }
  if (!isNonEmptyString(story?.sourceReference)) {
    issues.push(
      issue(
        "missing_field",
        "story.sourceReference is required",
        `${path}.sourceReference`
      )
    );
  }
  if (!Array.isArray(story?.characters)) {
    issues.push(
      issue(
        "missing_field",
        "story.characters must be an array",
        `${path}.characters`
      )
    );
  }
  if (!isNonEmptyString(story?.theme)) {
    issues.push(issue("missing_field", "story.theme is required", `${path}.theme`));
  }
  if (!isNonEmptyString(story?.content)) {
    issues.push(
      issue("empty_content", "story.content must be non-empty", `${path}.content`)
    );
  }
  if (!isNonEmptyString(story?.lesson)) {
    issues.push(
      issue("empty_lesson", "story.lesson must be non-empty", `${path}.lesson`)
    );
  }
  if (!isNonEmptyString(story?.closingThought)) {
    issues.push(
      issue(
        "empty_closing_thought",
        "story.closingThought must be non-empty",
        `${path}.closingThought`
      )
    );
  }
  if (
    story?.traditionNote !== undefined &&
    story?.traditionNote !== null &&
    typeof story.traditionNote !== "string"
  ) {
    issues.push(
      issue(
        "missing_field",
        "traditionNote must be a string or null",
        `${path}.traditionNote`
      )
    );
  }
  if (!isOptionalArtwork(story?.artwork)) {
    issues.push(
      issue("invalid_artwork", "story.artwork must be a string or null", `${path}.artwork`)
    );
  } else {
    validateArtworkField(story.artwork, `${path}.artwork`, issues);
  }
}

/**
 * Pure catalog validator for the master Krishna Leela JSON.
 * Returns all issues (does not throw). Empty array = ready to ship.
 */
export function validateLeelaCatalog(
  catalog: LeelaCatalog
): LeelaValidationIssue[] {
  const issues: LeelaValidationIssue[] = [];

  if (!catalog || !Array.isArray(catalog.chapters)) {
    return [
      issue("missing_field", "catalog.chapters must be an array", "chapters"),
    ];
  }

  const chapters = catalog.chapters;
  const chapterIds = new Set<string>();
  const storyIds = new Set<string>();

  if (chapters.length !== EXPECTED_LEELA_CHAPTER_COUNT) {
    issues.push(
      issue(
        "chapter_count",
        `expected ${EXPECTED_LEELA_CHAPTER_COUNT} chapters, found ${chapters.length}`,
        "chapters"
      )
    );
  }

  const orderedByOrder = [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const orders = orderedByOrder.map((c) => c.order);
  const expectedOrders = Array.from(
    { length: EXPECTED_LEELA_CHAPTER_COUNT },
    (_, i) => i + 1
  );
  if (
    orders.length === EXPECTED_LEELA_CHAPTER_COUNT &&
    JSON.stringify(orders) !== JSON.stringify(expectedOrders)
  ) {
    issues.push(
      issue(
        "chapter_order",
        `chapter.order must be contiguous 1..${EXPECTED_LEELA_CHAPTER_COUNT}, found [${orders.join(", ")}]`,
        "chapters"
      )
    );
  }

  const titlesInOrder = orderedByOrder.map((c) => c.title);
  if (
    titlesInOrder.length === EXPECTED_LEELA_CHAPTER_COUNT &&
    JSON.stringify(titlesInOrder) !==
      JSON.stringify([...EXPECTED_LEELA_CHAPTER_TITLES])
  ) {
    issues.push(
      issue(
        "chapter_titles",
        `chapter titles in order must match the canonical seven; found ${JSON.stringify(titlesInOrder)}`,
        "chapters"
      )
    );
  }

  chapters.forEach((chapter, chapterIndex) => {
    validateChapterShape(chapter, chapterIndex, issues);
    const chapterPath = `chapters[${chapterIndex}]`;

    if (isNonEmptyString(chapter?.id)) {
      if (chapterIds.has(chapter.id)) {
        issues.push(
          issue(
            "duplicate_chapter_id",
            `duplicate chapter id "${chapter.id}"`,
            `${chapterPath}.id`
          )
        );
      }
      chapterIds.add(chapter.id);
    }

    if (!Array.isArray(chapter?.stories)) return;

    const ordersInChapter = new Set<number>();
    chapter.stories.forEach((story, storyIndex) => {
      const storyPath = `${chapterPath}.stories[${storyIndex}]`;
      validateStoryShape(story, storyPath, chapter.id, issues);

      if (isNonEmptyString(story?.id)) {
        if (storyIds.has(story.id)) {
          issues.push(
            issue(
              "duplicate_story_id",
              `duplicate story id "${story.id}"`,
              `${storyPath}.id`
            )
          );
        }
        storyIds.add(story.id);
      }

      if (typeof story?.order === "number" && Number.isFinite(story.order)) {
        if (ordersInChapter.has(story.order)) {
          issues.push(
            issue(
              "duplicate_story_order",
              `duplicate story.order ${story.order} in chapter "${chapter.id}"`,
              `${storyPath}.order`
            )
          );
        }
        ordersInChapter.add(story.order);
      }
    });

    if (chapter.stories.length > 0) {
      const sortedOrders = [...ordersInChapter].sort((a, b) => a - b);
      const expected = Array.from(
        { length: chapter.stories.length },
        (_, i) => i + 1
      );
      if (JSON.stringify(sortedOrders) !== JSON.stringify(expected)) {
        issues.push(
          issue(
            "story_order",
            `story.order in chapter "${chapter.id}" must be contiguous 1..${chapter.stories.length}, found [${sortedOrders.join(", ")}]`,
            `${chapterPath}.stories`
          )
        );
      }
    }
  });

  // Reachability: every nested story must be uniquely findable by id scan
  // (mirrors getLeelaStoryById / getAllLeelaStories once catalog is loaded).
  for (const chapter of chapters) {
    if (!Array.isArray(chapter?.stories)) continue;
    for (const story of chapter.stories) {
      if (!isNonEmptyString(story?.id)) continue;
      let hits = 0;
      for (const ch of chapters) {
        if (!Array.isArray(ch?.stories)) continue;
        hits += ch.stories.filter((s) => s?.id === story.id).length;
      }
      if (hits !== 1) {
        issues.push(
          issue(
            "unreachable_story",
            `story "${story.id}" is not uniquely reachable (hits=${hits})`,
            `story:${story.id}`
          )
        );
      }
    }
  }

  return issues;
}

/** Convenience for the bundled catalog — empty array means import-ready. */
export function assertLeelaCatalogValid(catalog: LeelaCatalog): void {
  const issues = validateLeelaCatalog(catalog);
  if (issues.length > 0) {
    const detail = issues
      .map((i) => `${i.code}${i.path ? ` @ ${i.path}` : ""}: ${i.message}`)
      .join("\n");
    throw new Error(`Leela catalog validation failed:\n${detail}`);
  }
}
