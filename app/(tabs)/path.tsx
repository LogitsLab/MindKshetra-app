import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/Screen";
import { PathTile } from "@/components/SlokaCard";
import { Rise } from "@/components/Rise";
import { ScreenHeader } from "@/components/ScreenHeader";
import { HOME_PATHS } from "@/data/homePaths";
import { useLanguage } from "@/context/LanguageContext";
import { motion, spacing } from "@/theme/tokens";

/**
 * Path tab — equal 2-column grid of path intros.
 */
export default function PathTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const bottomPad = spacing.tabBar + insets.bottom + spacing.fab + spacing.lg;

  const pairs = Array.from(
    { length: Math.ceil(HOME_PATHS.length / 2) },
    (_, row) => HOME_PATHS.slice(row * 2, row * 2 + 2)
  );

  return (
    <Screen atmosphere="soft" padded testID="screen-path">
      <ScreenHeader title={t("homePaths")} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad, paddingTop: spacing.xs }}
        showsVerticalScrollIndicator={false}
      >
        <Rise delay={motion.staggerMs} style={styles.grid}>
          {pairs.map((pair, row) => (
            <View key={row} style={styles.row}>
              {pair.map((path) => (
                <PathTile
                  key={path.index}
                  index={path.index}
                  title={t(path.titleKey)}
                  body={t(path.blurbKey)}
                  image={path.image}
                  imageFocus={path.imageFocus}
                  mark={path.mark}
                  onPress={() => router.push(path.href)}
                  style={pair.length === 1 ? styles.halfAlone : undefined}
                />
              ))}
            </View>
          ))}
        </Rise>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  halfAlone: {
    maxWidth: "48.5%",
  },
});
