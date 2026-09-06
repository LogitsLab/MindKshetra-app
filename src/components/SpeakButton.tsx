import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { resolveRecitationUrl } from "@/audio/manifest";
import {
  getNarrationSession,
  playUrl,
  prefetchAudioUrl,
  stopNarration,
  stopNarrationIfOwner,
} from "@/audio/narration";
import { Text } from "@/components/Text";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  chapter: number;
  verseNumber: number;
  listenLabel: string;
  stopLabel: string;
  unsupportedLabel?: string;
  /** Smaller control for tight layouts. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Sanskrit recitation control — plays the real recorded recitation .m4a for a
 * verse and nothing else. The app has no text-to-speech: when no recording
 * exists for a verse the button is disabled. Stops global narration only when
 * this instance owns the active session, so a late-mounting button cannot cut
 * off recitation already playing elsewhere.
 */
export function SpeakButton({
  chapter,
  verseNumber,
  listenLabel,
  stopLabel,
  unsupportedLabel = "Audio isn’t available",
  compact = false,
  style,
  testID,
}: Props) {
  const { colors } = useTheme();
  const [speaking, setSpeaking] = useState(false);
  const [recitationReady, setRecitationReady] = useState(false);
  const ownerSessionRef = useRef<number | null>(null);
  const genRef = useRef(0);

  // When the verse changes: stop only if we own the player.
  useEffect(() => {
    if (ownerSessionRef.current != null) {
      stopNarrationIfOwner(ownerSessionRef.current);
      ownerSessionRef.current = null;
    }
    setSpeaking(false);
  }, [chapter, verseNumber]);

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
  }, [chapter, verseNumber]);

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
    const url = await resolveRecitationUrl(chapter, verseNumber);
    if (myGen !== genRef.current) return;
    if (!url) {
      setSpeaking(false);
      return;
    }

    const bindOwner = () => {
      ownerSessionRef.current = getNarrationSession();
    };
    const clearOwner = () => {
      ownerSessionRef.current = null;
      setSpeaking(false);
    };

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
  }, [speaking, chapter, verseNumber]);

  const disabled = !recitationReady;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: speaking }}
      accessibilityLabel={
        disabled ? unsupportedLabel : speaking ? stopLabel : listenLabel
      }
      testID={testID}
      disabled={disabled}
      onPress={() => void toggle()}
      style={({ pressed }) => [
        styles.btn,
        compact ? styles.btnCompact : null,
        {
          borderColor: speaking ? colors.brass : colors.line,
          backgroundColor: speaking ? colors.surfaceHover : "transparent",
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text
        variant="eyebrow"
        color={colors.brassSoft}
        style={compact ? styles.compactLabel : undefined}
      >
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
  btnCompact: {
    minHeight: 32,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
  },
  compactLabel: {
    fontSize: 10,
  },
});
