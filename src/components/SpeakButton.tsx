import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { resolveRecitationUrl } from "@/audio/manifest";
import {
  getNarrationSession,
  playOrSpeak,
  playUrl,
  prefetchAudioUrl,
  stopNarration,
  stopNarrationIfOwner,
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
 * Only stops global narration when this instance owns the active session, so a
 * late-mounting story Listen cannot kill Sanskrit playback mid-verse.
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
  const ownerSessionRef = useRef<number | null>(null);
  const genRef = useRef(0);

  // When verse/lang/text changes: stop only if we own the player.
  useEffect(() => {
    if (ownerSessionRef.current != null) {
      stopNarrationIfOwner(ownerSessionRef.current);
      ownerSessionRef.current = null;
    }
    setSpeaking(false);
  }, [text, lang, chapter, verseNumber]);

  // Unmount: stop only our session (another SpeakButton may still be playing).
  useEffect(
    () => () => {
      if (ownerSessionRef.current != null) {
        stopNarrationIfOwner(ownerSessionRef.current);
        ownerSessionRef.current = null;
      }
    },
    []
  );

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
      if (ownerSessionRef.current != null) {
        stopNarrationIfOwner(ownerSessionRef.current);
      } else {
        stopNarration();
      }
      ownerSessionRef.current = null;
      setSpeaking(false);
      return;
    }

    const myGen = ++genRef.current;

    const url =
      chapter != null && verseNumber != null
        ? await resolveRecitationUrl(chapter, verseNumber)
        : null;

    if (myGen !== genRef.current) return;

    const bindOwner = () => {
      ownerSessionRef.current = getNarrationSession();
    };

    const clearOwner = () => {
      ownerSessionRef.current = null;
      setSpeaking(false);
    };

    if (recitationOnly) {
      if (!url) {
        setSpeaking(false);
        return;
      }
      const ok = await playUrl(url, {
        onStart: () => {
          if (myGen !== genRef.current) return;
          bindOwner();
          setSpeaking(true);
        },
        onDone: () => {
          if (myGen !== genRef.current) return;
          clearOwner();
        },
        onStopped: () => {
          if (myGen !== genRef.current) return;
          clearOwner();
        },
        onError: () => {
          if (myGen !== genRef.current) return;
          clearOwner();
        },
      });
      if (!ok && myGen === genRef.current) clearOwner();
      return;
    }

    const ok = await playOrSpeak(text, {
      lang,
      url,
      onStart: () => {
        if (myGen !== genRef.current) return;
        bindOwner();
        setSpeaking(true);
      },
      onDone: () => {
        if (myGen !== genRef.current) return;
        clearOwner();
      },
      onStopped: () => {
        if (myGen !== genRef.current) return;
        clearOwner();
      },
      onError: () => {
        if (myGen !== genRef.current) return;
        clearOwner();
      },
    });
    if (!ok && myGen === genRef.current) clearOwner();
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
