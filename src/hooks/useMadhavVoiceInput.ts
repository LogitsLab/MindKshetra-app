/**
 * Voice input is not shipped. `expo-speech-recognition` must stay uninstalled:
 * Apple’s binary scanner (ITMS-90683) still requires
 * NSSpeechRecognitionUsageDescription if the SDK is linked, even when the UI
 * never calls it. Ask Madhav is type-and-send only.
 */

export function getSpeechModule(): null {
  return null;
}

export function resolveLocale(
  _lang: "en" | "hi",
  _supported: string[] | undefined,
): string {
  return "en-US";
}

export function useMadhavVoiceInput(_opts: {
  lang: "en" | "hi";
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
}) {
  return {
    isListening: false,
    isSupported: false,
    startListening: async () => {},
    stopListening: () => {},
  };
}
