import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { resolveRecitationUrl } from "@/audio/manifest";
import {
  playOrSpeak,
  playUrl,
  prefetchAudioUrl,
  stopNarration,
} from "@/audio/narration";
import { Text } from "@/components/Text";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  text: string;
  lang: "en" | "hi";
  listenLabel: string;
  stopLabel: string;
  unsupportedLabel?: string;
  chapter?: number;
  verseNumber?: number;
  /** When true, only play if a recitation file exists — no TTS fallback. */
  recitationOnly?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Web-parity Speak control — Sanskrit recitation (file only) or story TTS.
 */
export function SpeakButton({
  text,
  lang,
  listenLabel,
  stopLabel,
  unsupportedLabel = "Audio isn’t available",
  chapter,
  verseNumber,
  recitationOnly = false,
  style,
  testID,
}: Props) {
  const { colors } = useTheme();
  const [speaking, setSpeaking] = useState(false);
  const [recitationReady, setRecitationReady] = useState(!recitationOnly);

  useEffect(() => {
    stopNarration();
    setSpeaking(false);
  }, [text, lang, chapter, verseNumber]);

  useEffect(() => () => stopNarration(), []);

  useEffect(() => {
    if (!recitationOnly || chapter == null || verseNumber == null) {
      setRecitationReady(true);
      return;
    }
    let cancelled = false;
    void resolveRecitationUrl(chapter, verseNumber).then((url) => {
      if (cancelled) return;
      setRecitationReady(Boolean(url));
      // Warm edge/HTTP cache so the first Listen isn’t a cold download.
      prefetchAudioUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [recitationOnly, chapter, verseNumber]);

  const toggle = useCallback(async () => {
    if (speaking) {
      stopNarration();
      setSpeaking(false);
      return;
    }

    const url =
      chapter != null && verseNumber != null
        ? await resolveRecitationUrl(chapter, verseNumber)
        : null;

    if (recitationOnly) {
      if (!url) {
        setSpeaking(false);
        return;
      }
      const ok = await playUrl(url, {
        onStart: () => setSpeaking(true),
        onDone: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
      if (!ok) setSpeaking(false);
      return;
    }

    const ok = await playOrSpeak(text, {
      lang,
      url,
      onStart: () => setSpeaking(true),
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
    if (!ok) setSpeaking(false);
  }, [speaking, text, lang, chapter, verseNumber, recitationOnly]);

  const disabled = recitationOnly ? !recitationReady : !text.trim();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: speaking }}
      accessibilityLabel={
        disabled && recitationOnly
          ? unsupportedLabel
          : speaking
            ? stopLabel
            : listenLabel
      }
      testID={testID}
      disabled={disabled}
      onPress={() => void toggle()}
      style={({ pressed }) => [
        styles.btn,
        {
          borderColor: speaking ? colors.brass : "rgba(201,162,39,0.45)",
          backgroundColor: speaking
            ? "rgba(201,162,39,0.16)"
            : "transparent",
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text variant="eyebrow" color={colors.brassSoft}>
        {speaking ? stopLabel : listenLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 40,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
