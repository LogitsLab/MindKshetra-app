import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { PageHero } from "@/components/PageHero";
import { Rise } from "@/components/Rise";
import { PRACTICE_PATHS } from "@/data/paths";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { images } from "@/theme/assets";
import { spacing } from "@/theme/tokens";

export default function PathsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();

  return (
    <Screen atmosphere="soft" padded>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <PageHero
            image={images.pathPaths}
            eyebrow={t("homeLifestyleEyebrow")}
            title={t("homeBlockPathsTitle")}
            body={t("homeLifestyleBlurb")}
          />
        </Rise>

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          {PRACTICE_PATHS.map((path, i) => {
            const title = lang === "hi" ? path.title_hi : path.title_en;
            const intro = lang === "hi" ? path.intro_hi : path.intro_en;
            return (
              <Rise key={path.id} delay={40 * (i + 1)}>
                <Pressable onPress={() => router.push(`/paths/${path.id}`)}>
                  <Panel strong={i === 0}>
                    <Text variant="eyebrow" color={colors.brassSoft}>
                      {path.days_count}{" "}
                      {lang === "hi" ? "दिन" : "days"}
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
