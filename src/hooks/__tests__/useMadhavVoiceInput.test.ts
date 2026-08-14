/**
 * Speech recognition is not shipped. The hook must never require
 * expo-speech-recognition — that native module is what triggered ITMS-90683
 * after the mic UI was already gone.
 */

import { getSpeechModule, useMadhavVoiceInput } from "../useMadhavVoiceInput";

describe("useMadhavVoiceInput (unshipped)", () => {
  it("does not load a speech native module", () => {
    expect(getSpeechModule()).toBeNull();
  });

  it("never requires expo-speech-recognition", () => {
    const source = require("fs").readFileSync(
      require("path").join(__dirname, "../useMadhavVoiceInput.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from ["']expo-speech-recognition["']/);
    expect(source).not.toMatch(/require\(["']expo-speech-recognition["']\)/);
    expect(source).not.toMatch(/requireOptionalNativeModule/);
  });

  it("reports unsupported and is a no-op", () => {
    const { isListening, isSupported, startListening, stopListening } =
      useMadhavVoiceInput({
        lang: "en",
        onTranscript: jest.fn(),
      });
    expect(isListening).toBe(false);
    expect(isSupported).toBe(false);
    expect(typeof startListening).toBe("function");
    expect(typeof stopListening).toBe("function");
  });
});
