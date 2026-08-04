import React from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { siteUrl } from "@/api/client";
import { Button } from "@/components/Button";
import { PageHero } from "@/components/PageHero";
import { Panel } from "@/components/Panel";
import { Rise } from "@/components/Rise";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { CARE_RESOURCES } from "@/data/community";
import { images } from "@/theme/assets";
import { spacing } from "@/theme/tokens";

const CARE_WEB = siteUrl("/care");

export default function CareScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  function resourceDetail(id: (typeof CARE_RESOURCES)[number]["id"]) {
    if (id === "tele-manas") return t("careTeleManasDetail");
    if (id === "icall") return t("careICallDetail");
    return t("careVandrevalaDetail");
  }

  return (
    <Screen atmosphere="soft" padded>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <PageHero
            image={images.pathCommunity}
            eyebrow={t("careEyebrow")}
            title={t("homeBlockCareTitle")}
            body={t("careHeroBody")}
          />
        </Rise>

        <Rise delay={40} style={styles.section}>
          <Panel strong style={{ borderColor: colors.danger }}>
            <Text variant="title" color={colors.danger} style={styles.panelTitle}>
              {t("careImmediateTitle")}
            </Text>
            <Text variant="soft">{t("careImmediateBody")}</Text>
          </Panel>
        </Rise>

        <Rise delay={80} style={styles.section}>
          <Text variant="title">{t("careIndiaTitle")}</Text>
          <Text variant="muted" style={styles.sectionIntro}>
            {t("careIndiaBody")}
          </Text>
          <View style={styles.resourceList}>
            {CARE_RESOURCES.map((resource) => (
              <Panel key={resource.id}>
                <Text variant="title" style={styles.resourceName}>
                  {resource.name}
                </Text>
                <Text variant="muted">{resourceDetail(resource.id)}</Text>
                <Text color={colors.brassSoft} style={styles.phone}>
                  {resource.phone}
                </Text>
                <View style={styles.button}>
                  <Button
                    label={`${t("careCall")} ${resource.name}`}
                    onPress={() => void Linking.openURL(resource.phoneUrl)}
                  />
                </View>
              </Panel>
            ))}
          </View>
        </Rise>

        <Rise delay={120} style={styles.section}>
          <Panel>
            <Text variant="muted">{t("carePrivacyNote")}</Text>
            <View style={styles.button}>
              <Button
                label={t("careMoreResources")}
                variant="ghost"
                onPress={() => void Linking.openURL(CARE_WEB)}
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
  sectionIntro: {
    marginTop: spacing.xs,
  },
  resourceList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  resourceName: {
    fontSize: 18,
  },
  phone: {
    marginTop: spacing.sm,
    fontFamily: "Sora_600SemiBold",
  },
  button: {
    marginTop: spacing.md,
  },
});
