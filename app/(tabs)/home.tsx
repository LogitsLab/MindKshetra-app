import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { BrandMark } from "@/components/BrandMark";
import { Panel } from "@/components/Panel";
import { PathTile } from "@/components/SlokaCard";
import { Rise } from "@/components/Rise";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentApi, userApi } from "@/api/endpoints";
import { moods } from "@/data/moods";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { images, moodAccent } from "@/theme/assets";
import { motion, radii, spacing } from "@/theme/tokens";
import type { Sloka } from "@/types";

const PREVIEW_MOOD_IDS = [
  "anxious",
  "hopeful",
  "confused",
  "grateful",
  "lonely",
  "purpose",
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const { isSignedIn } = useAuth();
  const [streak, setStreak] = useState(0);
  const [votd, setVotd] = useState<Sloka | null>(null);

  const day = Math.floor(Date.now() / 86400000);
  const votdId = (day % 701) + 1;

  const previewMoods = useMemo(() => {
    return PREVIEW_MOOD_IDS.map((id, i) => {
      const found = moods.find((m) => m.id === id);
      return found ?? moods[(day + i) % moods.length];
    }).filter(Boolean);
  }, [day]);

  useEffect(() => {
    contentApi
      .sloka(votdId)
      .then(setVotd)
      .catch(() => undefined);
  }, [votdId]);

  useEffect(() => {
    if (!isSignedIn) return;
    userApi
      .streak()
      .then((s) => setStreak(s.current ?? 0))
      .catch(() => undefined);
  }, [isSignedIn]);

  const bottomPad = spacing.tabBar + insets.bottom + spacing.fab + spacing.lg;
  const translation = votd
    ? lang === "hi"
      ? votd.hindi_translation
      : votd.english_translation
    : null;

  const paths = [
    {
      index: "01",
      title: t("homeExploreTitle"),
      body: lang === "hi" ? "१८ अध्याय" : "18 chapters",
      image: images.pathExplore,
      mark: "explore" as const,
      href: "/(tabs)/explore" as const,
    },
    {
      index: "02",
      title: t("homeMoodTitle"),
      body: lang === "hi" ? "भाव से" : "By feeling",
      image: images.pathMood,
      mark: "mood" as const,
      href: "/(tabs)/mood" as const,
    },
    {
      index: "03",
      title: t("homeMadhavTitle"),
      body: lang === "hi" ? "पूछें और सुनें" : "Ask & listen",
      image: images.pathMadhav,
      mark: "madhav" as const,
      href: "/madhav" as const,
    },
    {
      index: "04",
      title: t("homeAstroTitle"),
      body: lang === "hi" ? "आपकी कुंडली" : "Your chart",
      // Same as web: astrology reuses explore path photo until a dedicated asset exists
      image: images.pathExplore,
      mark: "astrology" as const,
      href: "/(tabs)/astrology" as const,
    },
  ];

  return (
    <Screen atmosphere="soft" padded>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: bottomPad,
          paddingTop: spacing.sm,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top chrome */}
        {/*
          The brand and the streak are two different facts and used to share one
          slot: once you had a streak, "MindKshetra" was replaced by "4 days" and
          the app stopped naming itself on its own home screen. They sit side by
          side now, with the streak as a brass count that only appears when there
          is one.
        */}
        <ScreenHeader
          leading={
            <Rise>
              <View style={styles.brandRow}>
                <BrandMark size={28} />
                <Text
                  variant="muted"
                  style={{ marginLeft: spacing.sm }}
                  color={colors.textSoft}
                >
                  MindKshetra
                </Text>
                {streak > 0 ? (
                  <>
                    <View
                      style={[styles.brandDot, { backgroundColor: colors.brass }]}
                    />
                    <Text variant="muted" color={colors.brassSoft}>
                      {streak} {t("homeStreakLabel")}
                    </Text>
                  </>
                ) : null}
              </View>
            </Rise>
          }
        />

        {/* Brand-first hero */}
        <Rise delay={motion.staggerMs} style={styles.hero}>
          <Text
            style={[styles.watermark, { color: colors.text }]}
            numberOfLines={1}
          >
            मनः
          </Text>
          <Text
            variant="display"
            style={{ fontSize: 40, lineHeight: 44 }}
          >
            MindKshetra
          </Text>
          <Text
            variant="title"
            color={colors.brassSoft}
            style={{
              marginTop: spacing.sm,
              fontSize: 18,
              lineHeight: 26,
              maxWidth: 320,
            }}
          >
            {t("homeTagline")}
          </Text>
          <View style={styles.ctaRow}>
            <View style={{ flex: 1 }}>
              <Button
                label={t("homeCtaMadhav")}
                onPress={() => router.push("/madhav")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={t("homeCtaExplore")}
                variant="ghost"
                onPress={() => router.push("/(tabs)/explore")}
              />
            </View>
          </View>
        </Rise>

        {/* Featured verse — the day’s sit */}
        <Rise delay={motion.staggerMs * 2} style={{ marginTop: spacing.xl }}>
          <Pressable
            onPress={() =>
              router.push(votd ? `/sloka/${votd.id}` : "/verse-of-the-day")
            }
          >
            <Panel strong style={styles.votd}>
              <View style={styles.votdHead}>
                <Text variant="eyebrow" color={colors.brassSoft}>
                  {t("homeFeaturedEyebrow")}
                </Text>
                {votd ? (
                  <Text variant="eyebrow" color={colors.textMuted}>
                    {votd.chapter}.{votd.verse_number}
                  </Text>
                ) : null}
              </View>
              {votd ? (
                <>
                  <Text
                    variant="sanskrit"
                    style={{
                      marginTop: spacing.md,
                      fontSize: 20,
                      lineHeight: 32,
                    }}
                    numberOfLines={3}
                  >
                    {votd.sanskrit_devanagari}
                  </Text>
                  {translation ? (
                    <Text
                      variant="soft"
                      style={{ marginTop: spacing.md }}
                      numberOfLines={3}
                    >
                      {translation}
                    </Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Text variant="title" style={{ marginTop: spacing.md }}>
                    {lang === "hi" ? "आज का श्लोक" : "Today’s verse"}
                  </Text>
                  <Text variant="soft" style={{ marginTop: spacing.xs }}>
                    {lang === "hi"
                      ? "एक श्लोक, एक दिन"
                      : "One verse to sit with"}
                  </Text>
                </>
              )}
              <Text
                variant="muted"
                color={colors.brassSoft}
                style={{ marginTop: spacing.md }}
              >
                {t("homeFeaturedCta")} →
              </Text>
            </Panel>
          </Pressable>
        </Rise>

        {/* Equal path grid */}
        <Rise delay={motion.staggerMs * 3} style={{ marginTop: spacing.xl }}>
          <Text variant="eyebrow" color={colors.brassSoft}>
            {t("homePaths")}
          </Text>
          <View style={styles.pathGrid}>
            <View style={styles.pathRow}>
              <PathTile
                index={paths[0].index}
                title={paths[0].title}
                body={paths[0].body}
                image={paths[0].image}
                mark={paths[0].mark}
                onPress={() => router.push(paths[0].href)}
              />
              <PathTile
                index={paths[1].index}
                title={paths[1].title}
                body={paths[1].body}
                image={paths[1].image}
                mark={paths[1].mark}
                onPress={() => router.push(paths[1].href)}
              />
            </View>
            <View style={styles.pathRow}>
              <PathTile
                index={paths[2].index}
                title={paths[2].title}
                body={paths[2].body}
                image={paths[2].image}
                mark={paths[2].mark}
                onPress={() => router.push(paths[2].href)}
              />
              <PathTile
                index={paths[3].index}
                title={paths[3].title}
                body={paths[3].body}
                image={paths[3].image}
                mark={paths[3].mark}
                onPress={() => router.push(paths[3].href)}
              />
            </View>
          </View>
        </Rise>

        {/* Mood chips — arrive by feeling */}
        <Rise delay={motion.staggerMs * 4} style={{ marginTop: spacing.xl }}>
          <View style={styles.moodHead}>
            <View style={{ flex: 1 }}>
              <Text variant="eyebrow" color={colors.brassSoft}>
                {t("homeMoodsEyebrow")}
              </Text>
              <Text variant="title" style={{ marginTop: spacing.xs, fontSize: 20 }}>
                {t("homeMoodsTitle")}
              </Text>
            </View>
            <Pressable onPress={() => router.push("/(tabs)/mood")}>
              <Text variant="muted" color={colors.brassSoft}>
                {t("homeMoodsAll")} →
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodRow}
          >
            {previewMoods.map((mood) => {
              const accent = moodAccent[mood.id] ?? colors.brass;
              return (
                <Pressable
                  key={mood.id}
                  onPress={() => router.push(`/(tabs)/mood/${mood.id}`)}
                  style={({ pressed }) => [
                    styles.moodChip,
                    {
                      borderColor: `${accent}66`,
                      backgroundColor: pressed
                        ? `${accent}28`
                        : `${accent}14`,
                    },
                  ]}
                >
                  <View style={[styles.moodDot, { backgroundColor: accent }]} />
                  <Text
                    variant="body"
                    style={{ fontSize: 14, fontFamily: "Sora_600SemiBold" }}
                  >
                    {lang === "hi" ? mood.labelHi : mood.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Rise>

        {/* Closing Madhav band */}
        <Rise delay={motion.staggerMs * 5} style={{ marginTop: spacing.xl }}>
          <Pressable
            onPress={() => router.push("/madhav")}
            style={({ pressed }) => [
              styles.closeBand,
              { borderColor: colors.line, opacity: pressed ? 0.92 : 1 },
            ]}
          >
            <Image
              source={images.pathMadhav}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[
                "rgba(7,9,15,0.88)",
                "rgba(7,9,15,0.55)",
                "rgba(7,9,15,0.35)",
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.closeCopy}>
              <Text
                variant="title"
                color={colors.onMedia}
                style={{ fontSize: 22, lineHeight: 28, maxWidth: 220 }}
              >
                {t("homeCloseLine")}
              </Text>
              <Text
                variant="muted"
                color={colors.brassSoft}
                style={{ marginTop: spacing.md }}
              >
                {t("homeCloseCta")} →
              </Text>
            </View>
          </Pressable>
        </Rise>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    gap: spacing.sm,
  },
  brandDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    opacity: 0.7,
  },
  hero: {
    marginTop: spacing.xl,
    minHeight: 200,
    justifyContent: "center",
    overflow: "hidden",
  },
  watermark: {
    position: "absolute",
    right: -16,
    top: -28,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 120,
    lineHeight: 120,
    opacity: 0.05,
  },
  ctaRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  votd: {
    paddingVertical: spacing.lg,
  },
  votdHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pathGrid: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  pathRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  moodHead: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  moodRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  closeBand: {
    minHeight: 148,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "center",
  },
  closeCopy: {
    padding: spacing.lg,
  },
});
