import React from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { siteLabel, siteUrl } from "@/api/client";
import { Button } from "@/components/Button";
import { PageHero } from "@/components/PageHero";
import { Panel } from "@/components/Panel";
import { Rise } from "@/components/Rise";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { images } from "@/theme/assets";
import { spacing } from "@/theme/tokens";

const SUPPORT_WEB = siteUrl("/support");

export default function SupportScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <Screen atmosphere="soft" padded>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <PageHero
            image={images.pathPaths}
            eyebrow={t("supportEyebrow")}
            title={t("homeBlockSupportTitle")}
            intro={t("supportHeroBody")}
            compact
          />
        </Rise>

        <Rise delay={40} style={styles.section}>
          <Panel strong>
            <Text variant="title" color={colors.brassSoft} style={styles.panelTitle}>
              {t("supportPromiseTitle")}
            </Text>
            <Text variant="soft">{t("supportPromiseBody")}</Text>
          </Panel>
        </Rise>

        <Rise delay={80} style={styles.section}>
          <Panel>
            <Text variant="title" style={styles.panelTitle}>
              {t("supportFundsTitle")}
            </Text>
            <Text variant="soft">{t("supportFundsBody")}</Text>
            <Text variant="soft" style={styles.noPressure}>
              {t("supportNoPressure")}
            </Text>
          </Panel>
        </Rise>

        <Rise delay={120} style={styles.section}>
          <Panel>
            <Text variant="muted">{t("supportWebHandoff")}</Text>
            <Text color={colors.brassSoft} style={styles.site}>
              {siteLabel("/support")}
            </Text>
            <View style={styles.button}>
              <Button
                label={t("supportOpenDana")}
                onPress={() => void Linking.openURL(SUPPORT_WEB)}
              />
            </View>
          </Panel>
        </Rise>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl,
  },
  section: {
    marginTop: spacing.lg,
  },
  panelTitle: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  noPressure: {
    marginTop: spacing.md,
  },
  site: {
    marginTop: spacing.sm,
    fontFamily: "Sora_600SemiBold",
  },
  button: {
    marginTop: spacing.md,
  },
});
