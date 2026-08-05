import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { CoverImage } from "@/components/CoverImage";
import { Panel } from "@/components/Panel";
import { PageHero } from "@/components/PageHero";
import { Rise } from "@/components/Rise";
import { PRACTICE_PATHS } from "@/data/paths";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useJourneyRuns } from "@/hooks/useJourneyRun";
import { images } from "@/theme/assets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radii, spacing } from "@/theme/tokens";

function fill(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, String(v)),
    template
  );
}

export default function PathsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const runs = useJourneyRuns(PRACTICE_PATHS);
  const bottomPad = spacing.tabBar + insets.bottom + spacing.fab + spacing.lg;

  const featured = useMemo(() => {
    const inProgress = PRACTICE_PATHS.find((path) => {
      const run = runs[path.id];
      return run && run.completedCount < path.days_count;
    });
    return inProgress ?? PRACTICE_PATHS[0];
  }, [runs]);

  const featuredRun = runs[featured.id];
  const featuredDone = featuredRun
    ? featuredRun.completedCount >= featured.days_count
    : false;
  const featuredProgress = featuredRun
    ? Math.min(100, (featuredRun.completedCount / featured.days_count) * 100)
    : 0;

  return (
    <Screen atmosphere="soft" padded>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <PageHero
            image={images.pathPaths}
            eyebrow={t("homeLifestyleEyebrow")}
            title={t("homeBlockPathsTitle")}
            meta={
              featuredRun && !featuredDone ? (
                <Text variant="muted" color={colors.onMediaMuted}>
                  {fill(t("pathRunProgress"), {
                    n: featuredRun.currentDay,
                    total: featured.days_count,
                  })}
                </Text>
              ) : null
            }
            actions={
              <Button
                label={
                  featuredRun && !featuredDone
                    ? lang === "hi"
                      ? "जारी रखें"
                      : "Continue path"
                    : lang === "hi"
                      ? "पथ शुरू करें"
                      : "Begin a path"
                }
                onPress={() => router.push(`/paths/${featured.id}`)}
              />
            }
          />
        </Rise>

        {featuredRun && !featuredDone ? (
          <Rise delay={40} style={{ marginTop: spacing.lg }}>
            <Pressable
              onPress={() => router.push(`/paths/${featured.id}`)}
              style={({ pressed }) => [
                styles.featured,
                {
                  borderColor: colors.brass,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                },
              ]}
            >
              <CoverImage source={images.pathPaths} opacity={0.9} />
              <LinearGradient
                colors={["rgba(7,9,15,0.35)", "rgba(7,9,15,0.88)"]}
                style={StyleSheet.absoluteFillObject}
              />
              <Text variant="eyebrow" color={colors.brassSoft}>
                {lang === "hi" ? "जारी रखें" : "Continue"}
              </Text>
              <Text
                variant="title"
                color={colors.onMedia}
                style={{ marginTop: spacing.sm, fontSize: 22 }}
              >
                {lang === "hi" ? featured.title_hi : featured.title_en}
              </Text>
              <View style={[styles.barTrack, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${featuredProgress}%`, backgroundColor: colors.brass },
                  ]}
                />
              </View>
              <Text variant="muted" color={colors.onMediaMuted} style={{ marginTop: spacing.sm }}>
                {fill(t("pathRunProgress"), {
                  n: featuredRun.currentDay,
                  total: featured.days_count,
                })}
              </Text>
            </Pressable>
          </Rise>
        ) : null}

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          {PRACTICE_PATHS.map((path, i) => {
            const title = lang === "hi" ? path.title_hi : path.title_en;
            const intro = lang === "hi" ? path.intro_hi : path.intro_en;
            const run = runs[path.id];
            const done = run ? run.completedCount >= path.days_count : false;
            const pct = run
              ? Math.min(100, (run.completedCount / path.days_count) * 100)
              : 0;
            return (
              <Rise key={path.id} delay={40 * (i + 1)}>
                <Pressable
                  onPress={() => router.push(`/paths/${path.id}`)}
                  style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.985 : 1 }] }]}
                >
                  <Panel strong={path.id === featured.id}>
                    <Text variant="eyebrow" color={colors.brassSoft}>
                      {path.days_count} {lang === "hi" ? "दिन" : "days"}
                    </Text>
                    <Text
                      variant="title"
                      style={{ marginTop: spacing.sm, fontSize: 22 }}
                    >
                      {title}
                    </Text>
                    <Text variant="muted" style={{ marginTop: spacing.sm }}>
                      {intro}
                    </Text>
                    {run ? (
                      <>
                        <View
                          style={[
                            styles.barTrack,
                            { backgroundColor: colors.hairline, marginTop: spacing.md },
                          ]}
                        >
                          <View
                            style={[
                              styles.barFill,
                              { width: `${pct}%`, backgroundColor: colors.brass },
                            ]}
                          />
                        </View>
                        <Text
                          variant="muted"
                          color={colors.brassSoft}
                          style={{ marginTop: spacing.sm }}
                        >
                          {done
                            ? t("pathRunDone")
                            : fill(t("pathRunProgress"), {
                                n: run.currentDay,
                                total: path.days_count,
                              })}
                        </Text>
                      </>
                    ) : null}
                  </Panel>
                </Pressable>
              </Rise>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  featured: {
    minHeight: 168,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.lg,
    justifyContent: "flex-end",
    position: "relative",
    backgroundColor: "#0e1420",
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
});
