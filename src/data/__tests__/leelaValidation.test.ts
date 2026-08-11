/** @jest-environment node */

import catalogData from "@/data/leelas.json";
import type { LeelaCatalog } from "@/types/leela";
import {
  assertLeelaCatalogValid,
  validateLeelaCatalog,
} from "../leelaValidation";
import {
  getAllLeelaStories,
  getLeelaStoryById,
} from "../leelas";

const catalog = catalogData as LeelaCatalog;

function cloneCatalog(): LeelaCatalog {
  return JSON.parse(JSON.stringify(catalog)) as LeelaCatalog;
}

describe("validateLeelaCatalog — bundled temporary catalog", () => {
  it("accepts the current leelas.json with no issues", () => {
    expect(validateLeelaCatalog(catalog)).toEqual([]);
  });

  it("assertLeelaCatalogValid does not throw on the bundled catalog", () => {
    expect(() => assertLeelaCatalogValid(catalog)).not.toThrow();
  });

  it("every story is reachable through helpers", () => {
    for (const story of getAllLeelaStories()) {
      expect(getLeelaStoryById(story.id)?.id).toBe(story.id);
    }
  });
});

describe("validateLeelaCatalog — defect detection", () => {
  it("detects duplicate chapter ids", () => {
    const bad = cloneCatalog();
    bad.chapters[1].id = bad.chapters[0].id;
    expect(
      validateLeelaCatalog(bad).some((i) => i.code === "duplicate_chapter_id")
    ).toBe(true);
  });

  it("detects duplicate story ids", () => {
    const bad = cloneCatalog();
    bad.chapters[1].stories[0].id = bad.chapters[0].stories[0].id;
    expect(
      validateLeelaCatalog(bad).some((i) => i.code === "duplicate_story_id")
    ).toBe(true);
  });

  it("detects invalid chapterId on a nested story", () => {
    const bad = cloneCatalog();
    bad.chapters[0].stories[0].chapterId = "not-the-parent";
    expect(
      validateLeelaCatalog(bad).some((i) => i.code === "invalid_chapter_id")
    ).toBe(true);
  });

  it("detects duplicate story order within a chapter", () => {
    const bad = cloneCatalog();
    bad.chapters[0].stories[1].order = bad.chapters[0].stories[0].order;
    expect(
      validateLeelaCatalog(bad).some((i) => i.code === "duplicate_story_order")
    ).toBe(true);
  });

  it("detects invalid readingTimeMinutes", () => {
    const bad = cloneCatalog();
    bad.chapters[0].stories[0].readingTimeMinutes = 0;
    expect(
      validateLeelaCatalog(bad).some((i) => i.code === "invalid_reading_time")
    ).toBe(true);
  });

  it("detects empty content, lesson, and closingThought", () => {
    const bad = cloneCatalog();
    bad.chapters[0].stories[0].content = "   ";
    bad.chapters[0].stories[0].lesson = "";
    bad.chapters[0].stories[0].closingThought = "";
    const codes = new Set(validateLeelaCatalog(bad).map((i) => i.code));
    expect(codes.has("empty_content")).toBe(true);
    expect(codes.has("empty_lesson")).toBe(true);
    expect(codes.has("empty_closing_thought")).toBe(true);
  });

  it("detects missing source and sourceReference", () => {
    const bad = cloneCatalog();
    bad.chapters[0].stories[0].source = "";
    bad.chapters[0].stories[0].sourceReference = "  ";
    const codes = new Set(validateLeelaCatalog(bad).map((i) => i.code));
    expect(codes.has("missing_field")).toBe(true);
  });

  it("detects unknown artwork keys but allows null", () => {
    const bad = cloneCatalog();
    bad.chapters[0].stories[0].artwork = "not-a-real-key";
    expect(
      validateLeelaCatalog(bad).some((i) => i.code === "unknown_artwork")
    ).toBe(true);

    const ok = cloneCatalog();
    ok.chapters[0].stories[0].artwork = null;
    expect(
      validateLeelaCatalog(ok).some((i) => i.code === "unknown_artwork")
    ).toBe(false);
  });

  it("detects broken chapter ordering", () => {
    const bad = cloneCatalog();
    bad.chapters[0].order = 9;
    expect(
      validateLeelaCatalog(bad).some((i) => i.code === "chapter_order")
    ).toBe(true);
  });

  it("detects non-contiguous story ordering within a chapter", () => {
    const bad = cloneCatalog();
    bad.chapters[0].stories[1].order = 5;
    expect(
      validateLeelaCatalog(bad).some((i) => i.code === "story_order")
    ).toBe(true);
  });

  it("allows long multi-paragraph Unicode content without truncation", () => {
    const ok = cloneCatalog();
    const long = Array.from({ length: 40 }, (_, i) =>
      `Paragraph ${i + 1} — Śrī Kṛṣṇa · कृष्ण · “quoted” text.`
    ).join("\n\n");
    expect(long.length).toBeGreaterThan(800);
    ok.chapters[0].stories[0].content = long;
    expect(validateLeelaCatalog(ok)).toEqual([]);
  });
});
