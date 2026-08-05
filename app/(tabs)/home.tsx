import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { CoverImage } from "@/components/CoverImage";
import { PathTile } from "@/components/SlokaCard";
import { PracticeLifestyleGrid } from "@/components/PracticeLifestyleGrid";
import { Rise } from "@/components/Rise";
import { HomeHero } from "@/components/HomeHero";
import { VotdCarousel } from "@/components/VotdCarousel";
import { userApi } from "@/api/endpoints";
import { HOME_PATHS } from "@/data/homePaths";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useFeaturedVerses } from "@/hooks/useFeaturedVerses";
import { images } from "@/theme/assets";
import { motion, radii, spacing } from "@/theme/tokens";
import { truncateAtWord } from "@/utils/text";

/**
 * Full companion Home — VOTD, practice, paths, together, Madhav.
 * Path / Practise tabs still hold the same grids for focused browsing.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { isSignedIn } = useAuth();
  const [streak, setStreak] = useState(0);
  const { verses, error: votdError, stale: votdStale } = useFeaturedVerses();

  useEffect(() => {
    if (!isSignedIn) return;
    userApi
      .streak()
      .then((s) => setStreak(s.current ?? 0))
      .catch(() => undefined);
  }, [isSignedIn]);

  const bottomPad =
    spacing.tabBar + insets.bottom + spacing.fab + spacing.fabInset + spacing.xl;

  return (
    <Screen
      testID="screen-home"
      atmosphere="soft"
      padded
      edges={["left", "right"]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingBottom: bottomPad,
        }}
        showsVerticalScrollIndicator={false}
      >
        <HomeHero
          votdSanskrit={verses[0]?.sloka.sanskrit_devanagari}
          topInset={insets.top}
          streak={streak}
        />

        <Rise delay={motion.staggerMs * 2} style={{ marginTop: spacing.md }}>
          <VotdCarousel
            verses={verses}
            error={votdError}
            stale={votdStale}
          />
        </Rise>

        <Rise delay={motion.staggerMs * 3} style={{ marginTop: spacing.xl }}>
          <Text variant="eyebrow" color={colors.brassSoft}>
            {t("homePaths")}
          </Text>
          <View style={[styles.pathGrid, { marginTop: spacing.md }]}>
            {Array.from(
              { length: Math.ceil(HOME_PATHS.length / 2) },
              (_, row) => HOME_PATHS.slice(row * 2, row * 2 + 2)
            ).map((pair, row) => (
              <View key={row} style={styles.pathRow}>
                {pair.map((path) => (
                  <PathTile
                    key={path.index}
                    index={path.index}
                    title={t(path.titleKey)}
                    body={t(path.blurbKey)}
                    image={path.image}
                    mark={path.mark}
                    onPress={() => router.push(path.href)}
                    style={pair.length === 1 ? { maxWidth: "48.5%" } : undefined}
                  />
                ))}
              </View>
            ))}
          </View>
        </Rise>

        <Rise delay={motion.staggerMs * 4} style={{ marginTop: spacing.xl }}>
          <PracticeLifestyleGrid />
        </Rise>

        <Rise delay={motion.staggerMs * 5} style={{ marginTop: spacing.xl }}>
          <Pressable
            onPress={() => router.push("/madhav")}
            style={({ pressed }) => [
              styles.closeBand,
              {
                borderColor: colors.line,
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
          >
            <CoverImage source={images.pathMadhav} opacity={0.9} />
            <LinearGradient
              colors={[
                "rgba(7,9,15,0.9)",
                "rgba(7,9,15,0.5)",
                "rgba(7,9,15,0.28)",
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.closeCopy}>
              <Text variant="eyebrow" color={colors.brassSoft}>
                Madhav
              </Text>
              <Text
                variant="title"
                color={colors.onMedia}
                style={styles.closeTitle}
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

        <Rise delay={motion.staggerMs * 6} style={{ marginTop: spacing.xl }}>
          <Text variant="eyebrow" color={colors.brassSoft}>
            {t("homeTogetherEyebrow")}
          </Text>
          <Text variant="title" style={styles.sectionTitle}>
            {t("homeTogetherTitle")}
          </Text>
          <View style={styles.togetherRow}>
            <TogetherTile
              image={images.pathCommunity}
              title={t("homeBlockSanghaTitle")}
              body={t("homeBlockSanghaBody")}
              onPress={() => router.push("/community")}
            />
            <TogetherTile
              image={images.pathMood}
              title={t("homeBlockCareTitle")}
              body={t("homeBlockCareBody")}
              onPress={() => router.push("/care")}
            />
            <TogetherTile
              image={images.pathPaths}
              title={t("homeBlockSupportTitle")}
              body={t("homeBlockSupportBody")}
              onPress={() => router.push("/support")}
            />
          </View>
        </Rise>
      </ScrollView>
    </Screen>
  );
}

function TogetherTile({
  image,
  title,
  body,
  onPress,
}: {
  image: ImageSourcePropType;
  title: string;
  body: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.togetherTile,
        {
          borderColor: colors.line,
          opacity: pressed ? 0.94 : 1,
          transform: [{ scale: pressed ? 0.975 : 1 }],
        },
      ]}
    >
      <CoverImage source={image} opacity={0.88} />
      <LinearGradient
        colors={["rgba(7,9,15,0.1)", "rgba(7,9,15,0.45)", "rgba(7,9,15,0.92)"]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.togetherCopy}>
        <Text
          variant="title"
          color={colors.onMedia}
          style={styles.togetherTitle}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text
          variant="muted"
          color={colors.onMediaMuted}
          style={styles.togetherBody}
          numberOfLines={2}
        >
          {truncateAtWord(body, 48)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    fontSize: 22,
    lineHeight: 28,
  },
  pathGrid: {
    gap: spacing.sm,
  },
  pathRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  togetherRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  togetherTile: {
    flex: 1,
    minHeight: 148,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "flex-end",
    backgroundColor: "#0e1420",
    position: "relative",
  },
  togetherCopy: {
    padding: spacing.sm + 2,
    zIndex: 1,
  },
  togetherTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  togetherBody: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
  },
  closeBand: {
    minHeight: 168,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "center",
    backgroundColor: "#0e1420",
    position: "relative",
  },
  closeCopy: {
    padding: spacing.lg,
    maxWidth: 320,
    zIndex: 1,
  },
  closeTitle: {
    fontSize: 22,
    lineHeight: 28,
    marginTop: spacing.sm,
  },
});
