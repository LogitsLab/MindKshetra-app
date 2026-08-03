import React, { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { BrandMark } from "@/components/BrandMark";
import { BrandHeroTitle } from "@/components/BrandWordmark";
import { Panel } from "@/components/Panel";
import { PathTile } from "@/components/SlokaCard";
import { Rise } from "@/components/Rise";
import { sadhanaApi } from "@/api/endpoints";
import { getSadhanaLog, localDayStamp } from "@/storage/local";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useVotd } from "@/hooks/useVotd";
import { images } from "@/theme/assets";
import { motion, spacing } from "@/theme/tokens";

/**
 * Home — UI 2.0 / Stitch `02-home`
 * Brand + invite, Verse of the Day glass, four cinematic path tiles,
 * soft Community · Care · Support. No streak/stats hero (practice-first).
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const { session } = useAuth();
  const { votd, nakshatra: votdNakshatra } = useVotd();
  const [sadhanaDone, setSadhanaDone] = React.useState(false);

  const sessionUserId = session?.user.id ?? null;
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const checkLocal = async () => {
        const log = await getSadhanaLog();
        const today = localDayStamp();
        return log.some((e) => e.practice === "flow" && e.occurredOn === today);
      };
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
          } else if (alive) {
            setSadhanaDone(await checkLocal());
          }
        } catch {
          try {
            if (alive) setSadhanaDone(await checkLocal());
          } catch {
            /* leave as-is */
          }
        }
      })();
      return () => {
        alive = false;
      };
    }, [sessionUserId])
  );

  const bottomPad = spacing.tabBar + insets.bottom + spacing.fab + spacing.lg;
  const translation = votd
    ? lang === "hi"
      ? votd.hindi_translation
      : votd.english_translation
    : null;

  const paths = useMemo(
    () => [
      {
        index: "01",
        title: t("homeMoodTitle"),
        body: lang === "hi" ? "भाव से श्लोक" : "Verses that meet you",
        image: images.pathMood,
        mark: "mood" as const,
        href: "/(tabs)/mood" as const,
      },
      {
        index: "02",
        title: t("homeMadhavTitle"),
        body: lang === "hi" ? "गीता मार्गदर्शक" : "Gita guide",
        image: images.pathMadhav,
        mark: "madhav" as const,
        href: "/madhav" as const,
      },
      {
        index: "03",
        title: lang === "hi" ? "अभ्यास" : "Practice",
        body: sadhanaDone
          ? t("homeSadhanaDone")
          : lang === "hi"
            ? "ध्यान · जप · साधना"
            : "Sit · japa · sādhana",
        image: images.pathMeditation,
        mark: "meditation" as const,
        href: "/meditation" as const,
      },
      {
        index: "04",
        title: t("homeAstroTitle"),
        body: lang === "hi" ? "ज्योतिष" : "Jyotish · panchang",
        image: images.pathAstrology,
        mark: "astrology" as const,
        href: "/(tabs)/astrology" as const,
      },
    ],
    [t, lang, sadhanaDone]
  );

  return (
    <Screen atmosphere="soft" padded>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: bottomPad,
          paddingTop: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <View style={styles.brandBlock}>
            <BrandMark size={32} />
            <BrandHeroTitle fontSize={36} style={{ marginTop: spacing.sm }} />
            <Text
              variant="soft"
              color={colors.textSoft}
              style={styles.invite}
            >
              {t("homeInvite")}
            </Text>
          </View>
        </Rise>

        <Rise delay={motion.staggerMs} style={{ marginTop: spacing.xl }}>
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
                    BG {votd.chapter}.{votd.verse_number}
                  </Text>
                ) : null}
              </View>
              {votd ? (
                <>
                  {translation ? (
                    <Text
                      variant="title"
                      style={{
                        marginTop: spacing.md,
                        fontSize: 18,
                        lineHeight: 28,
                        fontStyle: "italic",
                      }}
                      numberOfLines={4}
                    >
                      “{translation}”
                    </Text>
                  ) : (
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
                  )}
                </>
              ) : (
                <Text variant="title" style={{ marginTop: spacing.md }}>
                  {lang === "hi" ? "आज का श्लोक" : "Today’s verse"}
                </Text>
              )}
              <Text
                variant="muted"
                color={colors.brassSoft}
                style={{ marginTop: spacing.md }}
              >
                {t("homeFeaturedCta")} →
              </Text>
            </Panel>
            {votd && votdNakshatra ? (
              <Text variant="muted" style={{ marginTop: spacing.sm }}>
                {t("votdNakshatraLine").replace("{nakshatra}", votdNakshatra)}
              </Text>
            ) : null}
          </Pressable>
        </Rise>

        <Rise delay={motion.staggerMs * 2} style={{ marginTop: spacing.lg }}>
          {paths.map((path) => (
            <PathTile
              key={path.index}
              layout="wide"
              index={path.index}
              title={path.title}
              body={path.body}
              image={path.image}
              mark={path.mark}
              onPress={() => router.push(path.href)}
            />
          ))}
        </Rise>

        <Rise delay={motion.staggerMs * 3} style={styles.footerLinks}>
          <Pressable onPress={() => router.push("/community")}>
            <Text variant="muted" color={colors.textMuted}>
              {t("homeBlockSanghaTitle")}
            </Text>
          </Pressable>
          <Text variant="muted" color={colors.hairline}>
            ·
          </Text>
          <Pressable onPress={() => router.push("/account")}>
            <Text variant="muted" color={colors.textMuted}>
              {t("homeBlockCareTitle")}
            </Text>
          </Pressable>
          <Text variant="muted" color={colors.hairline}>
            ·
          </Text>
          <Pressable onPress={() => router.push("/privacy")}>
            <Text variant="muted" color={colors.textMuted}>
              Support
            </Text>
          </Pressable>
        </Rise>

        <Rise delay={motion.staggerMs * 3.5} style={{ marginTop: spacing.md }}>
          <Pressable onPress={() => router.push("/(tabs)/explore")}>
            <Text
              variant="muted"
              color={colors.brassSoft}
              style={{ textAlign: "center" }}
            >
              {t("homeExploreTitle")} →
            </Text>
          </Pressable>
        </Rise>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandBlock: {
    alignItems: "center",
    paddingTop: spacing.sm,
  },
  invite: {
    marginTop: spacing.sm,
    textAlign: "center",
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 22,
  },
  votd: {
    paddingVertical: spacing.lg,
  },
  votdHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerLinks: {
    marginTop: spacing.xl,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
});
