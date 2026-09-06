import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Rise } from "@/components/Rise";
import { HomeHero } from "@/components/HomeHero";
import { VotdCarousel } from "@/components/VotdCarousel";
import { ApiError } from "@/api/client";
import { astrologyApi, userApi } from "@/api/endpoints";
import { sittingProgram } from "@/data/meditation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useFeaturedVerses } from "@/hooks/useFeaturedVerses";
import { useMeditationProgress } from "@/hooks/useMeditationProgress";
import { usePanchang } from "@/hooks/usePanchang";
import { motion, radii, spacing } from "@/theme/tokens";
import { truncateAtWord } from "@/utils/text";

/** Warm-to-dark gradient variants so rail cards aren't identical photo tiles. */
const TINTS: [string, string][] = [
  ["#3a2b1c", "#141a26"],
  ["#243b3a", "#141a26"],
  ["#2c2540", "#141a26"],
  ["#3a2436", "#141a26"],
];

type RailItem = {
  key: string;
  glyph: string;
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
  const { t } = useLanguage();
  const { isSignedIn } = useAuth();
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const { verses, error: votdError, stale: votdStale } = useFeaturedVerses();
  const { panchang } = usePanchang();
  const med = useMeditationProgress();
  const [muhurat, setMuhurat] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
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

  const medProgress = Math.min(1, med.completedDays.length / (sittingProgram.days_count || 45));

  // Continue (learn / browse) — each destination appears once.
  const continueRail: RailItem[] = [
    { key: "explore", glyph: "☸", titleKey: "homeExploreTitle", descKey: "homeExploreBlurb", href: "/(tabs)/explore" },
    { key: "mood", glyph: "☺", titleKey: "homeMoodTitle", descKey: "homeMoodBlurb", href: "/(tabs)/mood" },
    { key: "astrology", glyph: "✦", titleKey: "homeAstroTitle", descKey: "homeAstroBlurb", href: "/(tabs)/astrology" },
    { key: "paths", glyph: "✿", titleKey: "homeBlockPathsTitle", descKey: "homeBlockPathsBody", href: "/paths" },
  ];
  // Practice (do) — distinct set; meditation carries live progress.
  const practiceRail: RailItem[] = [
    { key: "meditation", glyph: "❁", titleKey: "homeMeditationTitle", descKey: "homeMeditationBlurb", href: "/meditation", progress: medProgress },
    { key: "sadhana", glyph: "🪔", titleKey: "homeSadhanaTitle", descKey: "homeSadhanaBody", href: "/sadhana" },
    { key: "japa", glyph: "ॐ", titleKey: "homeJapaTitle", descKey: "homeJapaBody", href: "/japa" },
    { key: "panchang", glyph: "☾", titleKey: "homeBlockPanchangTitle", descKey: "homeBlockPanchangBody", href: "/panchang" },
  ];

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
          streak={streak}
          bestStreak={best}
        />

        {/* Info bar — timing cue, a single quiet row (not a card) */}
        {muhurat || panchang?.tithi ? (
          <Rise delay={motion.staggerMs * 2} style={{ marginTop: spacing.md }}>
            <Pressable
              onPress={() => router.push("/panchang")}
              accessibilityRole="link"
              style={[styles.infoBar, { borderColor: colors.hairline }]}
            >
              <Text style={{ color: colors.brassSoft, fontSize: 15 }}>◷</Text>
              <Text variant="muted" color={colors.textSoft} style={styles.infoText} numberOfLines={1}>
                {muhurat ? `${t("homeMuhuratCue").replace("{window}", muhurat)}` : ""}
                {muhurat && panchang?.tithi ? " · " : ""}
                {panchang?.tithi ?? ""}
              </Text>
              <Text style={{ color: colors.brass, fontSize: 16 }}>›</Text>
            </Pressable>
          </Rise>
        ) : null}

        {/* Daily verse — the one carousel */}
        <Rise delay={motion.staggerMs * 3} style={{ marginTop: spacing.lg }}>
          <VotdCarousel verses={verses} error={votdError} stale={votdStale} />
        </Rise>

        {/* Continue your path */}
        <Rise delay={motion.staggerMs * 4} style={{ marginTop: spacing.xl }}>
          <SectionHead
            eyebrow={t("homeContinueEyebrow")}
            actionLabel={t("homeSeeAll")}
            onAction={() => router.push("/path")}
          />
          <Rail items={continueRail} onPress={(h) => router.push(h)} />
        </Rise>

        {/* Practice paths */}
        <Rise delay={motion.staggerMs * 5} style={{ marginTop: spacing.xl }}>
          <SectionHead
            eyebrow={t("homePracticePathsEyebrow")}
            actionLabel={t("homeSeeAll")}
            onAction={() => router.push("/(tabs)/practise")}
          />
          <Rail items={practiceRail} onPress={(h) => router.push(h)} />
        </Rise>

        {/* Community & support — compact chips, not tall cards */}
        <Rise delay={motion.staggerMs * 6} style={{ marginTop: spacing.xl }}>
          <Text variant="eyebrow" color={colors.brassSoft}>
            {t("homeCommunityEyebrow")}
          </Text>
          <View style={styles.chipRow}>
            <CommunityChip label={t("homeCommunityCommunity")} onPress={() => router.push("/community")} />
            <CommunityChip label={t("homeCommunityCare")} care onPress={() => router.push("/care")} />
            <CommunityChip label={t("homeCommunityDana")} onPress={() => router.push("/support")} />
          </View>
        </Rise>
      </ScrollView>
    </Screen>
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
        <Text variant="muted" color={colors.brass} style={{ fontSize: 12 }}>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function Rail({
  items,
  onPress,
}: {
  items: RailItem[];
  onPress: (href: Href) => void;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
      style={{ marginHorizontal: -spacing.md }}
    >
      {items.map((item, i) => (
        <Pressable
          key={item.key}
          testID={`home-rail-${item.key}`}
          onPress={() => onPress(item.href)}
          accessibilityRole="button"
          accessibilityLabel={t(item.titleKey as never)}
          style={[styles.railCard, { borderColor: colors.hairline }]}
        >
          <LinearGradient colors={TINTS[i % TINTS.length]} style={styles.railArt}>
            <View style={[styles.railBadge, { borderColor: colors.line }]}>
              <Text style={{ color: colors.brassSoft, fontSize: 15 }}>{item.glyph}</Text>
            </View>
          </LinearGradient>
          <View style={styles.railBody}>
            <Text variant="body" color={colors.text} style={styles.railTitle} numberOfLines={1}>
              {t(item.titleKey as never)}
            </Text>
            <Text variant="muted" color={colors.textMuted} style={styles.railDesc} numberOfLines={2}>
              {truncateAtWord(t(item.descKey as never), 48)}
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
  );
}

function CommunityChip({
  label,
  onPress,
  care,
}: {
  label: string;
  onPress: () => void;
  care?: boolean;
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
          borderColor: care ? "rgba(224,138,146,0.45)" : colors.line,
          backgroundColor: care ? "rgba(224,138,146,0.08)" : colors.surface,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text variant="muted" color={care ? "#e08a92" : colors.textSoft} style={{ fontSize: 13 }}>
        {care ? "♥ " : ""}
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoText: { flex: 1, fontSize: 12.5, lineHeight: 16 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  rail: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  railCard: {
    width: 148,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
    backgroundColor: "rgba(238,242,247,0.045)",
  },
  railArt: {
    height: 74,
    justifyContent: "flex-end",
    padding: spacing.sm,
  },
  railBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth * 2,
    backgroundColor: "rgba(7,9,15,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  railBody: { padding: spacing.sm + 2 },
  railTitle: { fontSize: 14, fontFamily: "Sora_600SemiBold" },
  railDesc: { marginTop: 3, fontSize: 11, lineHeight: 15 },
  railBarTrack: {
    height: 5,
    borderRadius: 5,
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.09)",
    overflow: "hidden",
  },
  railBarFill: { height: "100%", borderRadius: 5 },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
