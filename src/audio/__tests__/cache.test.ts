import { cacheFileName, speechHash } from "@/audio/hash";

describe("audio disk cache names", () => {
  it("is a stable hash of the remote URL", () => {
    const url = "https://example.test/recitation/2-47.m4a";
    expect(cacheFileName(url)).toBe(`${speechHash(url)}.m4a`);
    expect(cacheFileName(url)).toBe(cacheFileName(url));
  });

  it("differs across verses", () => {
    expect(cacheFileName("https://x/1-1.m4a")).not.toBe(
      cacheFileName("https://x/1-2.m4a")
    );
  });
});
