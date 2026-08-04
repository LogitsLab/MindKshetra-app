/** @jest-environment node */

import { getSupabaseConfig } from "../config";

describe("getSupabaseConfig", () => {
  it("returns a complete public configuration", () => {
    expect(
      getSupabaseConfig({
        EXPO_PUBLIC_SUPABASE_URL: " https://project.supabase.co ",
        EXPO_PUBLIC_SUPABASE_ANON_KEY: " publishable-key ",
      })
    ).toEqual({
      url: "https://project.supabase.co",
      anonKey: "publishable-key",
    });
  });

  it.each([
    [{}, "EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"],
    [
      { EXPO_PUBLIC_SUPABASE_ANON_KEY: "configured-key" },
      "EXPO_PUBLIC_SUPABASE_URL",
      undefined,
    ],
    [
      { EXPO_PUBLIC_SUPABASE_URL: "https://configured.supabase.co" },
      "EXPO_PUBLIC_SUPABASE_ANON_KEY",
      undefined,
    ],
  ] as const)(
    "fails initialization when required values are missing",
    (env, expectedName, otherName) => {
      const read = () => getSupabaseConfig(env);

      expect(read).toThrow(expectedName);
      if (otherName) expect(read).toThrow(otherName);
    }
  );

  it("does not include configured values in an error", () => {
    const configuredKey = "publishable-value-that-must-not-leak";
    let message = "";

    try {
      getSupabaseConfig({ EXPO_PUBLIC_SUPABASE_ANON_KEY: configuredKey })
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain("EXPO_PUBLIC_SUPABASE_URL");
    expect(message).not.toContain(configuredKey);
  });
});
