import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { resolveRecitationUrl } from "@/audio/manifest";
import {
  getNarrationSession,
  pauseNarration,
  playUrl,
  prefetchAudioUrl,
  resumeNarration,
  stopNarration,
  stopNarrationIfOwner,
} from "@/audio/narration";
import { Text } from "@/components/Text";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

type Track = { verse: number; url: string };

type Props = {
  chapter: number;
  verseNumbers: number[];
  onVerseChange?: (verse: number) => void;
};

const GAP_MS = 1800;
const RESUME_KEY = (chapter: number) =>
  `mindkshetra-chapter-listen-${chapter}`;

/**
 * Continuous Sanskrit recitation for a chapter — per-verse files in order,
 * with progress, resume, gaps, and prefetch of the next clips.
 */
export function ChapterListenPlayer({
  chapter,
  verseNumbers,
  onVerseChange,
}: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<"idle" | "playing" | "paused">("idle");
  const [resumeVerse, setResumeVerse] = useState<number | null>(null);
  const ownerRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const tracksRef = useRef<Track[]>([]);
  const genRef = useRef(0);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(RESUME_KEY(chapter)).then((raw) => {
      if (cancelled) return;
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n) && n > 0) setResumeVerse(n);
      else setResumeVerse(null);
    });
    return () => {
      cancelled = true;
    };
  }, [chapter]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list: Track[] = [];
      for (const verse of verseNumbers) {
        const url = await resolveRecitationUrl(chapter, verse);
        if (url) list.push({ verse, url });
      }
      if (!cancelled) setTracks(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [chapter, verseNumbers]);

  useEffect(() => {
    tracksRef.current = tracks ?? [];
  }, [tracks]);

  const clearGap = () => {
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
  };

  const stop = useCallback(() => {
    genRef.current += 1;
    clearGap();
    if (ownerRef.current != null) {
      stopNarrationIfOwner(ownerRef.current);
      ownerRef.current = null;
    } else {
      stopNarration();
    }
    setStatus("idle");
  }, []);

  useEffect(
    () => () => {
      clearGap();
      if (ownerRef.current != null) {
        stopNarrationIfOwner(ownerRef.current);
        ownerRef.current = null;
      }
    },
    []
  );

  const prefetchAround = (i: number) => {
    const list = tracksRef.current;
    for (let j = i + 1; j <= i + 3 && j < list.length; j++) {
      prefetchAudioUrl(list[j].url);
    }
  };

  const persistResume = (verse: number) => {
    void AsyncStorage.setItem(RESUME_KEY(chapter), String(verse));
    setResumeVerse(verse);
  };

  const playFrom = useCallback(
    async (startIndex: number) => {
      const list = tracksRef.current;
      if (!list.length) return;
      clearGap();
      const next = Math.max(0, Math.min(startIndex, list.length - 1));
      indexRef.current = next;
      setIndex(next);
      const myGen = ++genRef.current;

      const playOne = async (i: number) => {
        if (myGen !== genRef.current) return;
        if (i >= list.length) {
          ownerRef.current = null;
          setStatus("idle");
          void AsyncStorage.removeItem(RESUME_KEY(chapter));
          setResumeVerse(null);
          return;
        }
        indexRef.current = i;
        setIndex(i);
        const track = list[i];
        onVerseChange?.(track.verse);
        persistResume(track.verse);
        prefetchAround(i);
        const started = await playUrl(track.url, {
          onStart: () => {
            if (myGen !== genRef.current) return;
            ownerRef.current = getNarrationSession();
            setStatus("playing");
          },
          onDone: () => {
            if (myGen !== genRef.current) return;
            gapTimerRef.current = setTimeout(() => {
              void playOne(i + 1);
            }, GAP_MS);
          },
          onError: () => {
            if (myGen !== genRef.current) return;
            void playOne(i + 1);
          },
          onStopped: () => {
            if (myGen !== genRef.current) return;
            setStatus("idle");
            ownerRef.current = null;
          },
        });
        if (!started && myGen === genRef.current) {
          void playOne(i + 1);
        }
      };

      await playOne(next);
    },
    [chapter, onVerseChange]
  );

  if (tracks === null) {
    return (
      <View
        style={[
          styles.box,
          { borderColor: colors.line, backgroundColor: colors.panel },
        ]}
      >
        <Text variant="muted">{t("chapterListenLoading")}</Text>
      </View>
    );
  }

  if (tracks.length === 0) {
    return (
      <View
        style={[
          styles.box,
          { borderColor: colors.line, backgroundColor: colors.panel },
        ]}
      >
        <Text variant="muted">{t("chapterListenUnavailable")}</Text>
      </View>
    );
  }

  const current = tracks[index];
  const progress =
    ((index + (status === "idle" ? 0 : 1)) / tracks.length) * 100;
  const resumeIndex =
    resumeVerse != null
      ? tracks.findIndex((tr) => tr.verse === resumeVerse)
      : -1;
  const label =
    status === "playing"
      ? t("chapterListenPause")
      : status === "paused"
        ? t("chapterListenResume")
        : resumeIndex > 0
          ? t("chapterListenContinue")
          : t("chapterListenPlay");

  return (
    <View
      style={[
        styles.box,
        { borderColor: colors.line, backgroundColor: colors.panel },
      ]}
    >
      <Text variant="eyebrow" color={colors.brassSoft}>
        {t("chapterListenEyebrow")}
      </Text>
      <Text variant="muted" style={{ marginTop: spacing.xs }}>
        {t("chapterListenBlurb")}
      </Text>
      <View
        style={[styles.progressTrack, { backgroundColor: colors.line }]}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(progress),
        }}
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.brass,
              width: `${
                status === "idle" && resumeIndex < 0
                  ? 0
                  : Math.max(4, progress)
              }%`,
            },
          ]}
        />
      </View>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => {
            if (status === "playing" && ownerRef.current != null) {
              pauseNarration();
              setStatus("paused");
              return;
            }
            if (status === "paused" && ownerRef.current != null) {
              if (resumeNarration(ownerRef.current)) setStatus("playing");
              else void playFrom(indexRef.current);
              return;
            }
            const start =
              status === "idle" && resumeIndex > 0 ? resumeIndex : 0;
            void playFrom(start);
          }}
          style={[styles.primary, { backgroundColor: colors.brass }]}
        >
          <Text color={colors.onBrass}>{label}</Text>
        </Pressable>
        {status === "idle" && resumeIndex > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("chapterListenFromStart")}
            onPress={() => void playFrom(0)}
            style={[styles.ghost, { borderColor: colors.line }]}
          >
            <Text color={colors.brassSoft}>{t("chapterListenFromStart")}</Text>
          </Pressable>
        ) : null}
        {status !== "idle" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("chapterListenStop")}
            onPress={stop}
            style={[styles.ghost, { borderColor: colors.line }]}
          >
            <Text color={colors.brassSoft}>{t("chapterListenStop")}</Text>
          </Pressable>
        ) : null}
        {status !== "idle" ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("chapterListenPrev")}
              disabled={index <= 0}
              onPress={() => void playFrom(indexRef.current - 1)}
              style={[
                styles.ghost,
                { borderColor: colors.line, opacity: index <= 0 ? 0.4 : 1 },
              ]}
            >
              <Text color={colors.textMuted}>←</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("chapterListenNext")}
              disabled={index >= tracks.length - 1}
              onPress={() => void playFrom(indexRef.current + 1)}
              style={[
                styles.ghost,
                {
                  borderColor: colors.line,
                  opacity: index >= tracks.length - 1 ? 0.4 : 1,
                },
              ]}
            >
              <Text color={colors.textMuted}>→</Text>
            </Pressable>
          </>
        ) : null}
      </View>
      {status !== "idle" && current ? (
        <Text
          variant="muted"
          color={colors.brassSoft}
          style={{ marginTop: spacing.sm }}
        >
          {t("chapterListenNow")
            .replace("{n}", String(current.verse))
            .replace("{total}", String(tracks.length))
            .replace("{i}", String(index + 1))}
        </Text>
      ) : (
        <Text
          variant="muted"
          style={{ marginTop: spacing.sm, fontSize: 12 }}
        >
          {t("chapterListenReady").replace("{n}", String(tracks.length))}
          {resumeIndex > 0
            ? ` · ${t("chapterListenResumeAt").replace("{n}", String(resumeVerse))}`
            : ""}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  progressTrack: {
    marginTop: spacing.md,
    height: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
    alignItems: "center",
  },
  primary: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    justifyContent: "center",
  },
  ghost: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "center",
  },
});
