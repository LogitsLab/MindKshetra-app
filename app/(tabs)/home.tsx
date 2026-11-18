import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Rise } from "@/components/Rise";
import { HomeHero } from "@/components/HomeHero";
import { VotdCarousel } from "@/components/VotdCarousel";
import { SadhanaCard } from "@/components/SadhanaCard";
import { CoverImage, type CoverImageFocus } from "@/components/CoverImage";
import { MoodIcon } from "@/components/MoodIcon";
import { ApiError } from "@/api/client";
import { astrologyApi, progressApi, userApi } from "@/api/endpoints";
import { HOME_PATHS } from "@/data/homePaths";
import { moods, previewMoodIds } from "@/data/moods";
import { sittingProgram } from "@/data/meditation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useFeaturedVerses } from "@/hooks/useFeaturedVerses";
import { useMeditationProgress } from "@/hooks/useMeditationProgress";
import { usePanchang } from "@/hooks/usePanchang";
import {
  getGuestProgress,
  getGuestStreakCurrent,
} from "@/storage/local";
import { images } from "@/theme/assets";
import { motion, radii, spacing } from "@/theme/tokens";
import { truncateAtWord } from "@/utils/text";

type RailItem = {
  key: string;
  image: ImageSourcePropType;
  imageFocus?: CoverImageFocus;
  titleKey: string;
  descKey: string;
  href: Href;
  progress?: number;
};

function fmtMuhuratWindow(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${new Date(startIso).toLocaleTimeString([], opts)}–${new Date(endIso).toLocaleTimeString([], opts)}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const { isSignedIn } = useAuth();
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [guestStreak, setGuestStreak] = useState(0);
  const [continueSlokaId, setContinueSlokaId] = useState<number | null>(null);
  const [continueCursor, setContinueCursor] = useState<{
    chapter: number;
    verse: number;
  } | null>(null);
  const { verses, error: votdError, stale: votdStale } = useFeaturedVerses();
  const { panchang } = usePanchang();
  const med = useMeditationProgress();
  const [muhurat, setMuhurat] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      void getGuestStreakCurrent().then(setGuestStreak);
      return;
    }
    userApi
      .streak()
      .then((s) => {
        setStreak(s.current ?? 0);
        setBest((s as { best?: number }).best ?? s.current ?? 0);
      })
      .catch(() => undefined);
  }, [isSignedIn]);

  useEffect(() => {
    let alive = true;
    void (isSignedIn ? progressApi.get() : getGuestProgress())
      .then((data) => {
        if (!alive) return;
        setContinueSlokaId(data.continueSlokaId ?? null);
        setContinueCursor(data.cursor ?? null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [isSignedIn]);

  useEffect(() => {
    const first = verses[0]?.sloka;
    if (!first) return;
    void import("@/widgets/syncVerseOfTheDay").then((m) =>
      m.syncVerseOfTheDayWidget({
        sloka: first,
        lang,
        nakshatra: panchang?.nakshatra ?? null,
      })
    );
  }, [verses, lang, panchang?.nakshatra]);
  useEffect(() => {
    let alive = true;
    void astrologyApi
      .muhurat()
      .then((data) => {
        if (!alive) return;
        const abhijit =
          data.muhurats?.find((m) => /abhijit/i.test(m.nameEn)) ?? data.muhurats?.[0];
        setMuhurat(
          abhijit?.startIso && abhijit?.endIso
            ? fmtMuhuratWindow(abhijit.startIso, abhijit.endIso)
            : null
        );
      })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && (e.status === 404 || e.status === 503)) setMuhurat(null);
        else setMuhurat(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const bottomPad =
    spacing.tabBar + insets.bottom + spacing.fab + spacing.fabInset + spacing.xl;

  // Paths — Madhav is FAB; meditation lives on Practise.
  const pathsRail: RailItem[] = HOME_PATHS.filter(
    (p) => p.mark !== "madhav" && p.mark !== "meditation"
  ).map((p) => ({
    key: p.mark,
    image: p.image,
    imageFocus: p.imageFocus,
    titleKey: p.titleKey,
    descKey: p.blurbKey,
    href: p.href,
  }));

  const nextMedDay = Math.min(
    sittingProgram.days_count || 45,
    Math.max(1, (med.completedDays.length ? Math.max(...med.completedDays) : 0) + 1)
  );
  const medHref = `/meditation/${nextMedDay}` as Href;
  const displayStreak = isSignedIn ? streak : guestStreak;
  const displayBest = isSignedIn ? best : guestStreak;
  const showGuestUpgrade = !isSignedIn && guestStreak >= 2;
  const hasContinue = continueSlokaId != null || continueCursor != null;

  return (
    <Screen testID="screen-home" atmosphere="soft" padded edges={["left", "right"]}>
      <ScrollView
        nestedScrollEnabled
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <HomeHero
          votdSanskrit={verses[0]?.sloka.sanskrit_devanagari}
          topInset={insets.top}
          streak={displayStreak}
          bestStreak={displayBest}
        />

        {/* Daily verse — the signature daily content, kept high */}
        <Rise delay={motion.staggerMs * 2} style={{ marginTop: spacing.md }}>
          <VotdCarousel verses={verses} error={votdError} stale={votdStale} />
        </Rise>

        {hasContinue ? (
          <Rise delay={motion.staggerMs * 2} style={{ marginTop: spacing.md }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (continueSlokaId != null) {
                  router.push(`/sloka/${continueSlokaId}`);
                  return;
                }
                if (continueCursor) {
                  router.push(`/(tabs)/explore/${continueCursor.chapter}`);
                }
              }}
              style={[
                styles.infoBar,
                { borderColor: colors.brass, backgroundColor: colors.surface },
              ]}
            >
              <Text variant="muted" color={colors.brassSoft}>
                {t("homeContinueRail")}
              </Text>
              <Text variant="muted" color={colors.text} style={styles.infoText} numberOfLines={1}>
                {continueCursor
                  ? `${continueCursor.chapter}.${continueCursor.verse}`
                  : t("continueReading")}
              </Text>
              <Text style={{ color: colors.brass, fontSize: 16 }}>›</Text>
            </Pressable>
          </Rise>
        ) : null}

        {showGuestUpgrade ? (
          <Rise delay={motion.staggerMs * 2} style={{ marginTop: spacing.sm }}>
            <Pressable
              onPress={() => router.push("/(tabs)/profile")}
              style={[
                styles.infoBar,
                { borderColor: colors.line, backgroundColor: colors.surface },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text variant="muted" color={colors.text}>
                  {t("guestStreakLabel").replace("{n}", String(guestStreak))}
                </Text>
                <Text variant="muted" color={colors.textMuted} style={{ marginTop: 2 }}>
                  {t("guestStreakUpgrade")}
                </Text>
              </View>
              <Text color={colors.brassSoft}>{t("guestStreakUpgradeCta")}</Text>
            </Pressable>
          </Rise>
        ) : null}

        {/* Begin today's sādhana — primary action */}
        <Rise delay={motion.staggerMs * 3} style={{ marginTop: spacing.lg }}>
          <SadhanaCard streak={displayStreak} />
        </Rise>

        <Rise delay={motion.staggerMs * 3} style={{ marginTop: spacing.md }}>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => router.push("/(tabs)/explore")}
              style={[styles.quickLink, { borderColor: colors.line, backgroundColor: colors.surface }]}
            >
              <Text color={colors.brassSoft}>{t("openTheGita")}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/practise")}
              style={[styles.quickLink, { borderColor: colors.line, backgroundColor: colors.surface }]}
            >
              <Text color={colors.brassSoft}>{t("navPractise")}</Text>
            </Pressable>
          </View>
        </Rise>

        {/* Today’s battlefield — panchang + verse + next sit */}
        <Rise delay={motion.staggerMs * 3} style={{ marginTop: spacing.lg }}>
          <View
            style={[
              styles.battlefield,
              { borderColor: colors.line, backgroundColor: colors.surface },
            ]}
          >
            <Text variant="eyebrow" color={colors.brassSoft}>
              {t("homeBattlefieldEyebrow")}
            </Text>
            <Text variant="title" color={colors.text} style={{ marginTop: spacing.xs }}>
              {t("homeBattlefieldTitle")}
            </Text>
            <Text variant="muted" style={{ marginTop: spacing.xs }}>
              {t("homeBattlefieldBlurb")}
            </Text>
            {panchang?.tithi ? (
              <Text variant="muted" color={colors.brassSoft} style={{ marginTop: spacing.sm }}>
                {panchang.tithi}
                {panchang.nakshatra ? ` · ${panchang.nakshatra}` : ""}
              </Text>
            ) : null}
            <View style={styles.battlefieldActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(medHref)}
                style={[styles.battlefieldCta, { backgroundColor: colors.brass }]}
              >
                <Text color={colors.onBrass}>{t("homeBattlefieldSit")}</Text>
              </Pressable>
              {verses[0] ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.push(`/sloka/${verses[0].sloka.id}`)}
                  style={[styles.battlefieldGhost, { borderColor: colors.line }]}
                >
                  <Text color={colors.brassSoft}>{t("homeBattlefieldVerse")}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Rise>

        {/* Panchang — sits above Today's feeling */}
        {muhurat || panchang?.tithi ? (
          <Rise delay={motion.staggerMs * 3} style={{ marginTop: spacing.lg }}>
            <Pressable
              onPress={() => router.push("/panchang")}
              accessibilityRole="link"
              style={[styles.infoBar, { borderColor: colors.line, backgroundColor: colors.surface }]}
            >
              <Text style={{ color: colors.brassSoft, fontSize: 15 }}>◷</Text>
              <Text variant="muted" color={colors.text} style={styles.infoText} numberOfLines={1}>
                {muhurat ? t("homeMuhuratCue").replace("{window}", muhurat) : ""}
                {muhurat && panchang?.tithi ? " · " : ""}
                {panchang?.tithi ?? ""}
              </Text>
              <Text style={{ color: colors.brass, fontSize: 16 }}>›</Text>
            </Pressable>
          </Rise>
        ) : null}

        {/* Today's feeling */}
        <Rise delay={motion.staggerMs * 4} style={{ marginTop: spacing.lg }}>
          <MoodSection />
        </Rise>

        {/* Paths */}
        <Rise delay={motion.staggerMs * 5} style={{ marginTop: spacing.xl }}>
          <SectionHead eyebrow={t("homePaths")} onAction={() => router.push("/path")} actionLabel={t("homeSeeAll")} />
          <Rail items={pathsRail} onPress={(h) => router.push(h)} />
        </Rise>

        {/* Community & support — 3 consistent chips */}
        <Rise delay={motion.staggerMs * 6} style={{ marginTop: spacing.xl }}>
          <Text variant="eyebrow" color={colors.brassSoft}>
            {t("homeCommunityEyebrow")}
          </Text>
          <View style={styles.chipRow}>
            <CommunityChip icon={<WheelIcon />} label={t("homeCommunityCommunity")} onPress={() => router.push("/community")} />
            <CommunityChip icon={<HeartIcon />} label={t("homeCommunityCare")} onPress={() => router.push("/care")} />
            <CommunityChip icon={<LotusIcon />} label={t("homeCommunityDana")} onPress={() => router.push("/support")} />
          </View>
        </Rise>
      </ScrollView>
    </Screen>
  );
}

function MoodSection() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const dayIndex = Math.floor(Date.now() / 86400000);
  const heroMoods = useMemo(
    () =>
      previewMoodIds
        .map((id, i) => moods.find((m) => m.id === id) ?? moods[(dayIndex + i) % moods.length])
        .filter(Boolean)
        .slice(0, 5),
    [dayIndex]
  );
  return (
    <View>
      <Text variant="eyebrow" color={colors.brassSoft}>
        {t("homeMoodsEyebrow")}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.moodRow}
        style={{ marginHorizontal: -spacing.md }}
      >
        {heroMoods.map((mood) => (
          <Pressable
            key={mood.id}
            onPress={() => router.push(`/(tabs)/mood/${mood.id}`)}
            style={[
              styles.moodChip,
              { borderColor: "rgba(201,162,39,0.7)", backgroundColor: colors.surfaceHover },
            ]}
          >
            <MoodIcon id={mood.id} size={22} color={colors.brassSoft} />
            <Text variant="muted" color={colors.text} style={styles.moodLabel}>
              {lang === "hi" ? mood.labelHi : mood.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable onPress={() => router.push("/(tabs)/mood")} hitSlop={8} style={styles.moreFeelings}>
        <Text variant="muted" color={colors.brassSoft} style={{ fontSize: 12 }}>
          {t("homeMoodsAll")}
        </Text>
      </Pressable>
    </View>
  );
}

function SectionHead({
  eyebrow,
  actionLabel,
  onAction,
}: {
  eyebrow: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHead}>
      <Text variant="eyebrow" color={colors.brassSoft}>
        {eyebrow}
      </Text>
      <Pressable onPress={onAction} hitSlop={8} accessibilityRole="link">
        <Text
          variant="muted"
          color={colors.brassSoft}
          style={{ fontSize: 12.5, fontFamily: "Sora_600SemiBold" }}
        >
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const RAIL_CARD_WIDTH = 150;

function Rail({ items, onPress }: { items: RailItem[]; onPress: (href: Href) => void }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  return (
    <View>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
      style={{ marginHorizontal: -spacing.md }}
      scrollEventThrottle={16}
      onScroll={(e) => {
        // Map the dot index to scroll *progress*, not raw offset / card stride:
        // at the end the offset only reaches contentWidth − viewport, so a
        // stride-based round can never light the last dots.
        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
        const maxOffset = contentSize.width - layoutMeasurement.width;
        const progress = maxOffset > 0 ? contentOffset.x / maxOffset : 0;
        const i = Math.round(progress * (items.length - 1));
        const clamped = Math.max(0, Math.min(items.length - 1, i));
        setIndex((prev) => (prev === clamped ? prev : clamped));
      }}
    >
      {items.map((item) => (
        <Pressable
          key={item.key}
          testID={`home-rail-${item.key}`}
          onPress={() => onPress(item.href)}
          accessibilityRole="button"
          accessibilityLabel={t(item.titleKey as never)}
          style={[styles.railCard, { borderColor: colors.line }]}
        >
          <CoverImage source={item.image} opacity={0.85} focus={item.imageFocus} />
          <LinearGradient
            colors={["rgba(7,9,15,0.1)", "rgba(7,9,15,0.45)", "rgba(7,9,15,0.9)"]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.railCopy}>
            <Text variant="title" color={colors.onMedia} numberOfLines={1} style={styles.railTitle}>
              {t(item.titleKey as never)}
            </Text>
            <Text
              variant="muted"
              color={colors.onMediaMuted}
              numberOfLines={2}
              style={styles.railDesc}
            >
              {truncateAtWord(t(item.descKey as never), 46)}
            </Text>
            {item.progress != null ? (
              <View style={styles.railBarTrack}>
                <View
                  style={[
                    styles.railBarFill,
                    { width: `${Math.round(item.progress * 100)}%`, backgroundColor: colors.brass },
                  ]}
                />
              </View>
            ) : null}
          </View>
        </Pressable>
      ))}
    </ScrollView>
      {items.length > 1 ? (
        <View style={styles.railDots}>
          {items.map((item, i) => (
            <View
              key={item.key}
              style={
                i === index
                  ? [styles.railDotActive, { backgroundColor: colors.brass }]
                  : [styles.railDot, { backgroundColor: colors.textMuted }]
              }
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Sangha — an eight-spoke dharma wheel, matching the PathMark line style. */
function WheelIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.5" stroke="#c9a227" strokeWidth="1.25" opacity={0.6} />
      <Circle cx="12" cy="12" r="2.6" stroke="#e2c45a" strokeWidth="1.25" />
      <Path
        d="M12 8.4V4.2 M12 15.6V19.8 M15.6 12H19.8 M8.4 12H4.2 M14.55 9.45L17.52 6.48 M14.55 14.55L17.52 17.52 M9.45 14.55L6.48 17.52 M9.45 9.45L6.48 6.48"
        stroke="#e2c45a"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Care — a soft heart outline. */
function HeartIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20.5C12 20.5 4 15 4 9.2A4 4 0 0 1 12 7.6 4 4 0 0 1 20 9.2C20 15 12 20.5 12 20.5Z"
        stroke="#e2c45a"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Dāna — a lotus, the giving-hand of the offering. */
function LotusIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5.5C13.7 8 13.7 11 12 13.6C10.3 11 10.3 8 12 5.5Z"
        stroke="#e2c45a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <Path
        d="M12 13.6C9.4 12.7 7 10.6 6.4 8C9 8 11 10.6 12 13.6Z M12 13.6C14.6 12.7 17 10.6 17.6 8C15 8 13 10.6 12 13.6Z"
        stroke="#c9a227"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <Path
        d="M5.5 15.5C7.5 17.6 16.5 17.6 18.5 15.5"
        stroke="#c9a227"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity={0.7}
      />
    </Svg>
  );
}

function CommunityChip({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: "rgba(201,162,39,0.38)",
          backgroundColor: colors.surfaceHover,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {icon}
      <Text variant="muted" color={colors.text} style={{ fontSize: 12.5 }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  infoText: { flex: 1, fontSize: 12.5, lineHeight: 16 },
  moodRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  moodLabel: { fontSize: 13, fontFamily: "Sora_600SemiBold" },
  moreFeelings: { alignSelf: "flex-end", marginTop: spacing.sm, paddingVertical: spacing.xs },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  rail: { paddingHorizontal: spacing.md, gap: spacing.sm },
  railCard: {
    width: RAIL_CARD_WIDTH,
    height: 172,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: "#0e1420",
    position: "relative",
  },
  railCopy: { padding: spacing.sm + 2, zIndex: 1 },
  railTitle: { fontSize: 15, lineHeight: 19 },
  railDesc: { marginTop: 3, fontSize: 11, lineHeight: 15 },
  railBarTrack: {
    height: 5,
    borderRadius: 5,
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  railBarFill: { height: "100%", borderRadius: 5 },
  railDots: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 5,
    marginTop: spacing.sm,
  },
  railDotActive: { width: 16, height: 5, borderRadius: 3 },
  railDot: { width: 5, height: 5, borderRadius: 3, opacity: 0.4 },
  chipRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  quickLink: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  battlefield: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  battlefieldActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  battlefieldCta: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  battlefieldGhost: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
