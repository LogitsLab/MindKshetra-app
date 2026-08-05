import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { CoverImage } from "@/components/CoverImage";
import { Text } from "@/components/Text";
import { Rise } from "@/components/Rise";
import { sadhanaApi, userApi } from "@/api/endpoints";
import { getSadhanaLog, localDayStamp } from "@/storage/local";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useMeditationProgress } from "@/hooks/useMeditationProgress";
import { usePanchang } from "@/hooks/usePanchang";
import { images } from "@/theme/assets";
import { motion, radii, spacing } from "@/theme/tokens";
import { truncateAtWord } from "@/utils/text";

type Layout = "featured" | "grid2";

type Props = {
  /** Hide the section title (when the parent already shows one). */
  hideHeader?: boolean;
  /**
   * `featured` — Home web layout (2 wide + 3 thirds).
   * `grid2` — equal 2-column tiles (Practise tab).
   */
  layout?: Layout;
  style?: StyleProp<ViewStyle>;
};

type TileSpec = {
  key: string;
  image: ImageSourcePropType;
  title: string;
  body: string;
  done?: boolean;
  onPress: () => void;
};

/**
 * Practice & lifestyle tiles — shared by Home and Practise tab.
 */
export function PracticeLifestyleGrid({
  hideHeader = false,
  layout = "featured",
  style,
}: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { session, isSignedIn } = useAuth();
  const med = useMeditationProgress();
  const { panchang } = usePanchang();
  const [sadhanaDone, setSadhanaDone] = useState(false);
  const [streak, setStreak] = useState(0);

  const sessionUserId = session?.user.id ?? null;
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          if (sessionUserId) {
            let tz: string | undefined;
            try {
              tz = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
            } catch {
              tz = undefined;
            }
            const s = await sadhanaApi.summary(tz);
            if (alive) setSadhanaDone(s.doneToday.includes("flow"));
          } else {
            const log = await getSadhanaLog();
            const today = localDayStamp();
            if (alive) {
              setSadhanaDone(
                log.some((e) => e.practice === "flow" && e.occurredOn === today)
              );
            }
          }
        } catch {
          try {
            const log = await getSadhanaLog();
            const today = localDayStamp();
            if (alive) {
              setSadhanaDone(
                log.some((e) => e.practice === "flow" && e.occurredOn === today)
              );
            }
          } catch {
            /* leave as-is */
          }
        }
        if (isSignedIn) {
          try {
            const s = await userApi.streak();
            if (alive) setStreak(s.current ?? 0);
          } catch {
            /* ignore */
          }
        }
      })();
      return () => {
        alive = false;
      };
    }, [sessionUserId, isSignedIn])
  );

  const sitDay = Math.min(45, Math.max(1, med.currentDay));
  const dayLine = panchang
    ? t("homeDayLine")
        .replace("{tithi}", panchang.tithi)
        .replace("{nakshatra}", panchang.nakshatra)
    : t("homeBlockPanchangBody");

  const tiles: TileSpec[] = useMemo(
    () => [
      {
        key: "sadhana",
        image: images.pathSadhana,
        title: sadhanaDone ? t("homeSadhanaDone") : t("homeSadhanaTitle"),
        body:
          sadhanaDone && streak > 0
            ? `${streak} ${t("homeStreakLabel")}`
            : t("homeSadhanaBody"),
        done: sadhanaDone,
        onPress: () => router.push("/sadhana"),
      },
      {
        key: "meditation",
        image: images.pathMeditation,
        title: med.loading
          ? t("homeMeditationTitle")
          : med.completedDays.length === 0
            ? t("medHomeStart")
            : t("medHomeContinue").replace("{n}", String(sitDay)),
        body: t("homeMeditationBlurb"),
        onPress: () =>
          router.push(med.loading ? "/meditation" : `/meditation/${sitDay}`),
      },
      {
        key: "japa",
        image: images.pathPaths,
        title: t("homeJapaTitle"),
        body: t("homeJapaBody"),
        onPress: () => router.push("/japa"),
      },
      {
        key: "panchang",
        image: images.pathPanchangRing,
        title: t("homeBlockPanchangTitle"),
        body: dayLine,
        onPress: () => router.push("/panchang"),
      },
      {
        key: "reminders",
        image: images.pathAstrology,
        title: t("homeBlockNotifTitle"),
        body: t("homeBlockNotifBody"),
        onPress: () => router.push("/(tabs)/profile"),
      },
    ],
    [
      sadhanaDone,
      streak,
      med.loading,
      med.completedDays.length,
      sitDay,
      dayLine,
      t,
      router,
    ]
  );

  const pairs = useMemo(() => {
    const rows: TileSpec[][] = [];
    for (let i = 0; i < tiles.length; i += 2) {
      rows.push(tiles.slice(i, i + 2));
    }
    return rows;
  }, [tiles]);

  return (
    <View style={style}>
      {!hideHeader ? (
        <Rise>
          <Text variant="eyebrow" color={colors.brassSoft}>
            {t("homeLifestyleEyebrow")}
          </Text>
          <Text variant="title" style={styles.sectionTitle}>
            {t("homeLifestyleTitle")}
          </Text>
        </Rise>
      ) : null}

      <Rise delay={hideHeader ? 0 : motion.staggerMs} style={styles.stack}>
        {layout === "grid2" ? (
          pairs.map((pair) => (
            <View key={pair.map((p) => p.key).join("-")} style={styles.row}>
              {pair.map((tile) => (
                <PracticeTile
                  key={tile.key}
                  image={tile.image}
                  title={tile.title}
                  body={tile.body}
                  done={tile.done}
                  onPress={tile.onPress}
                  style={pair.length === 1 ? styles.halfAlone : undefined}
                />
              ))}
            </View>
          ))
        ) : (
          <>
            <View style={styles.row}>
              <PracticeTile
                wide
                image={tiles[0].image}
                title={tiles[0].title}
                body={tiles[0].body}
                done={tiles[0].done}
                onPress={tiles[0].onPress}
              />
              <PracticeTile
                wide
                image={tiles[1].image}
                title={tiles[1].title}
                body={tiles[1].body}
                onPress={tiles[1].onPress}
              />
            </View>
            <View style={styles.row}>
              <PracticeTile
                image={tiles[2].image}
                title={tiles[2].title}
                body={tiles[2].body}
                onPress={tiles[2].onPress}
                compact
              />
              <PracticeTile
                image={tiles[3].image}
                title={tiles[3].title}
                body={tiles[3].body}
                onPress={tiles[3].onPress}
                compact
              />
              <PracticeTile
                image={tiles[4].image}
                title={tiles[4].title}
                body={tiles[4].body}
                onPress={tiles[4].onPress}
                compact
              />
            </View>
          </>
        )}
      </Rise>
    </View>
  );
}

export function PracticeTile({
  image,
  title,
  body,
  onPress,
  done,
  wide,
  compact,
  style,
}: {
  image: ImageSourcePropType;
  title: string;
  body: string;
  onPress: () => void;
  done?: boolean;
  wide?: boolean;
  /** Smaller third-width tile (Home featured row). */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const bodyLine = truncateAtWord(body, wide || !compact ? 64 : 42);
  const sizeStyle = compact
    ? styles.tileThird
    : wide
      ? styles.tileWide
      : styles.tileHalf;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        sizeStyle,
        style,
        {
          borderColor: done ? colors.brass : colors.line,
          transform: [{ scale: pressed ? 0.975 : 1 }],
          opacity: pressed ? 0.94 : 1,
        },
      ]}
    >
      <CoverImage source={image} opacity={0.9} />
      <LinearGradient
        colors={["rgba(7,9,15,0.05)", "rgba(7,9,15,0.35)", "rgba(7,9,15,0.88)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.tileCopy}>
        <Text
          variant="title"
          color={colors.onMedia}
          style={{
            fontSize: compact ? 15 : 17,
            lineHeight: compact ? 19 : 22,
          }}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        <Text
          variant="muted"
          color={colors.onMediaMuted}
          style={{ marginTop: 4, fontSize: 11, lineHeight: 15 }}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {bodyLine}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontSize: 22,
    lineHeight: 28,
  },
  stack: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tileWide: {
    flex: 1,
    minHeight: 168,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "flex-end",
    backgroundColor: "#0e1420",
    position: "relative",
  },
  tileHalf: {
    flex: 1,
    aspectRatio: 0.92,
    minHeight: 156,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "flex-end",
    backgroundColor: "#0e1420",
    position: "relative",
  },
  halfAlone: {
    maxWidth: "48.5%",
  },
  tileThird: {
    flex: 1,
    minHeight: 140,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "flex-end",
    backgroundColor: "#0e1420",
    position: "relative",
  },
  tileCopy: {
    padding: spacing.md,
    zIndex: 1,
  },
});
