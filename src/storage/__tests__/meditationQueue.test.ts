/** @jest-environment node */

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));
jest.mock("@/api/endpoints", () => ({
  meditationApi: { merge: jest.fn() },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { meditationApi } from "@/api/endpoints";
import {
  flushMeditationGuestQueue,
  queueMeditationGuestCompletion,
} from "../meditationQueue";

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const merge = meditationApi.merge as jest.MockedFunction<typeof meditationApi.merge>;

describe("meditation guest queue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("recovers a corrupt queue when adding a completion", async () => {
    storage.getItem.mockResolvedValue("{broken");

    await queueMeditationGuestCompletion({ sessionId: "day-1" });

    expect(storage.setItem).toHaveBeenCalledWith(
      "mindkshetra-meditation-queue",
      JSON.stringify([{ sessionId: "day-1" }])
    );
  });

  it("clears only after the server merge succeeds", async () => {
    storage.getItem.mockResolvedValue(JSON.stringify([{ sessionId: "day-1" }]));
    merge.mockResolvedValue({ ok: true, merged: 1 });

    await expect(flushMeditationGuestQueue()).resolves.toBe(1);
    expect(storage.removeItem).toHaveBeenCalledWith(
      "mindkshetra-meditation-queue"
    );
  });

  it("retains the queue when merge fails", async () => {
    storage.getItem.mockResolvedValue(JSON.stringify([{ sessionId: "day-1" }]));
    merge.mockRejectedValue(new Error("offline"));

    await expect(flushMeditationGuestQueue()).rejects.toThrow("offline");
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});
