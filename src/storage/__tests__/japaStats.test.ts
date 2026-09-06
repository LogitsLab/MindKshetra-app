/** @jest-environment node */

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getJapaStats,
  recordJapaBeads,
  localDayStamp,
  type JapaStats,
} from "../local";

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const KEY = "mindkshetra-japa-stats";

function useMemoryStore() {
  const store: Record<string, string> = {};
  storage.getItem.mockImplementation(async (k: string) => store[k] ?? null);
  storage.setItem.mockImplementation(async (k: string, v: string) => {
    store[k] = v;
  });
  return store;
}

describe("japa stats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts at zero with today's stamp", async () => {
    storage.getItem.mockResolvedValue(null);
    const s = await getJapaStats();
    expect(s).toEqual<JapaStats>({
      lifetimeBeads: 0,
      dayStamp: localDayStamp(),
      dayBeads: 0,
    });
  });

  it("accumulates lifetime and daily beads across sessions", async () => {
    useMemoryStore();
    await recordJapaBeads(108);
    const after = await recordJapaBeads(54);
    expect(after.lifetimeBeads).toBe(162);
    expect(after.dayBeads).toBe(162);
    expect(after.dayStamp).toBe(localDayStamp());
  });

  it("rolls the daily count over at a new day but keeps lifetime", async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify({ lifetimeBeads: 500, dayStamp: "2000-01-01", dayBeads: 90 })
    );
    const s = await getJapaStats();
    expect(s.lifetimeBeads).toBe(500);
    expect(s.dayBeads).toBe(0);
    expect(s.dayStamp).toBe(localDayStamp());
  });

  it("ignores non-positive counts", async () => {
    useMemoryStore();
    await recordJapaBeads(108);
    const same = await recordJapaBeads(0);
    expect(same.lifetimeBeads).toBe(108);
    const stillSame = await recordJapaBeads(-5);
    expect(stillSame.lifetimeBeads).toBe(108);
  });
});
