import { Platform } from "react-native";
import type { Sloka } from "@/types";

type SyncInput = {
  sloka: Pick<
    Sloka,
    "chapter" | "verse_number" | "english_translation" | "hindi_translation"
  >;
  lang?: "en" | "hi";
  nakshatra?: string | null;
};

/**
 * Push today’s verse into the Home / Lock Screen widget (iOS + Android native builds).
 * No-op on Expo Go / when the native module is missing.
 */
export async function syncVerseOfTheDayWidget(
  input: SyncInput
): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  try {
    const { VerseOfTheDay } = await import("../../widgets/VerseOfTheDay");
    const translation =
      (input.lang === "hi"
        ? input.sloka.hindi_translation
        : input.sloka.english_translation) ||
      input.sloka.english_translation ||
      "";
    const clipped =
      translation.length > 140
        ? `${translation.slice(0, 137).trimEnd()}…`
        : translation;
    VerseOfTheDay.updateSnapshot({
      refLabel: `Gita ${input.sloka.chapter}.${input.sloka.verse_number}`,
      translation: clipped,
      nakshatra: (input.nakshatra ?? "").trim(),
    });
  } catch {
    /* widget extension only exists in a native build with expo-widgets */
  }
}
