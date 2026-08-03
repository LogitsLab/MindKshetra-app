/** @jest-environment node */

import {
  PROMPT_COOLDOWN_MS,
  PROMPT_MAX_DECLINES,
  notificationCategory,
  notificationUrl,
  shouldShowPrompt,
} from "../logic";

const NOW = 1_750_000_000_000;

describe("shouldShowPrompt", () => {
  it("shows when the sheet has never been declined", () => {
    expect(
      shouldShowPrompt({ lastPromptAt: null, declineCount: 0 }, NOW)
    ).toBe(true);
  });

  it("skips inside the 14-day cooldown after a decline", () => {
    expect(
      shouldShowPrompt(
        { lastPromptAt: NOW - PROMPT_COOLDOWN_MS + 1, declineCount: 1 },
        NOW
      )
    ).toBe(false);
  });

  it("shows again exactly when the cooldown has elapsed", () => {
    expect(
      shouldShowPrompt(
        { lastPromptAt: NOW - PROMPT_COOLDOWN_MS, declineCount: 1 },
        NOW
      )
    ).toBe(true);
  });

  it("never shows after two declines, however long ago", () => {
    expect(
      shouldShowPrompt(
        {
          lastPromptAt: NOW - 10 * PROMPT_COOLDOWN_MS,
          declineCount: PROMPT_MAX_DECLINES,
        },
        NOW
      )
    ).toBe(false);
  });

  it("treats a decline count above the cap the same as the cap", () => {
    expect(
      shouldShowPrompt({ lastPromptAt: null, declineCount: 3 }, NOW)
    ).toBe(false);
  });
});

describe("notificationUrl", () => {
  it("accepts an app-relative route", () => {
    expect(notificationUrl({ url: "/sloka/123" })).toBe("/sloka/123");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(notificationUrl({ url: "https://evil.example/x" })).toBeNull();
    expect(notificationUrl({ url: "//evil.example/x" })).toBeNull();
  });

  it("rejects non-string, missing and malformed payloads", () => {
    expect(notificationUrl({ url: 42 })).toBeNull();
    expect(notificationUrl({})).toBeNull();
    expect(notificationUrl(null)).toBeNull();
    expect(notificationUrl("string-not-object")).toBeNull();
    expect(notificationUrl({ url: "sloka/123" })).toBeNull();
  });
});

describe("notificationCategory", () => {
  it("returns the category string when present", () => {
    expect(notificationCategory({ category: "daily_verse" })).toBe(
      "daily_verse"
    );
  });

  it("returns undefined for anything else", () => {
    expect(notificationCategory({ category: 7 })).toBeUndefined();
    expect(notificationCategory({})).toBeUndefined();
    expect(notificationCategory(null)).toBeUndefined();
  });
});
