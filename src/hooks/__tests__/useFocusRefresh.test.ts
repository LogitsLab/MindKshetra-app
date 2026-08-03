import {
  DEFAULT_FOCUS_TTL_MS,
  bumpFocusVersion,
  getFocusVersion,
  shouldRefetch,
} from "../useFocusRefresh";

// The hook itself needs a navigator; only its extracted pure core is under
// test. Stub the router import so loading the module does not drag it in.
jest.mock("expo-router", () => ({ useFocusEffect: jest.fn() }));

const NOW = 1_700_000_000_000;

function args(overrides: Partial<Parameters<typeof shouldRefetch>[0]> = {}) {
  return {
    lastFetchedAt: NOW - 1_000,
    now: NOW,
    ttlMs: DEFAULT_FOCUS_TTL_MS,
    lastSeenVersion: 0,
    currentVersion: 0,
    ...overrides,
  };
}

describe("shouldRefetch — TTL gating", () => {
  it("refetches when nothing has been fetched yet", () => {
    expect(shouldRefetch(args({ lastFetchedAt: null }))).toBe(true);
  });

  it("skips the refetch while the last success is fresher than the TTL", () => {
    expect(
      shouldRefetch(args({ lastFetchedAt: NOW - DEFAULT_FOCUS_TTL_MS + 1 }))
    ).toBe(false);
  });

  it("refetches once the TTL has fully elapsed (inclusive boundary)", () => {
    expect(
      shouldRefetch(args({ lastFetchedAt: NOW - DEFAULT_FOCUS_TTL_MS }))
    ).toBe(true);
  });

  it("honors a custom ttlMs", () => {
    expect(
      shouldRefetch(args({ ttlMs: 5_000, lastFetchedAt: NOW - 4_999 }))
    ).toBe(false);
    expect(
      shouldRefetch(args({ ttlMs: 5_000, lastFetchedAt: NOW - 5_000 }))
    ).toBe(true);
  });
});

describe("shouldRefetch — write invalidation", () => {
  it("refetches inside the TTL when the version moved since the last success", () => {
    expect(
      shouldRefetch(args({ lastSeenVersion: 1, currentVersion: 2 }))
    ).toBe(true);
  });

  it("does not refetch inside the TTL when the version is unchanged", () => {
    expect(
      shouldRefetch(args({ lastSeenVersion: 2, currentVersion: 2 }))
    ).toBe(false);
  });

  it("treats the pre-first-success sentinel (-1) as stale", () => {
    expect(
      shouldRefetch(args({ lastSeenVersion: -1, currentVersion: 0 }))
    ).toBe(true);
  });
});

describe("focus version counters", () => {
  it("starts at 0 for a never-bumped key", () => {
    expect(getFocusVersion("never-bumped")).toBe(0);
  });

  it("increments per key independently", () => {
    const a = getFocusVersion("counter-a");
    const b = getFocusVersion("counter-b");
    bumpFocusVersion("counter-a");
    bumpFocusVersion("counter-a");
    bumpFocusVersion("counter-b");
    expect(getFocusVersion("counter-a")).toBe(a + 2);
    expect(getFocusVersion("counter-b")).toBe(b + 1);
  });
});

describe("shouldRefetch + counters together", () => {
  it("a bump between two focuses forces the second refetch despite a fresh TTL", () => {
    const key = "progress-integration";
    const seen = getFocusVersion(key);

    // Focus 1 succeeded just now at version `seen`; focus 2 arrives early.
    expect(
      shouldRefetch(args({ lastSeenVersion: seen, currentVersion: getFocusVersion(key) }))
    ).toBe(false);

    bumpFocusVersion(key);

    expect(
      shouldRefetch(args({ lastSeenVersion: seen, currentVersion: getFocusVersion(key) }))
    ).toBe(true);
  });
});
