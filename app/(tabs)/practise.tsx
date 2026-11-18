import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/Screen";
import { PracticeLifestyleGrid } from "@/components/PracticeLifestyleGrid";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useLanguage } from "@/context/LanguageContext";
import { spacing } from "@/theme/tokens";

/**
 * Practise tab — ritual hub (sādhana, japa, sit, wallpapers…).
 * Home keeps “today”; this tab is where practice lives.
 */
export default function PractiseTabScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const bottomPad = spacing.tabBar + insets.bottom + spacing.fab + spacing.lg;

  return (
    <Screen atmosphere="soft" padded testID="screen-practise">
      <ScreenHeader
        title={t("navPractise")}
        subtitle={t("homePracticePathsEyebrow")}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <PracticeLifestyleGrid layout="grid2" style={styles.grid} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    marginTop: spacing.xs,
  },
});
