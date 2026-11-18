import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Share,
  StyleSheet,
  View,
} from "react-native";
import * as Sharing from "expo-sharing";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { PageHero } from "@/components/PageHero";
import { Rise } from "@/components/Rise";
import { Panel } from "@/components/Panel";
import { Button } from "@/components/Button";
import { siteUrl } from "@/api/client";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import catalog from "@/data/wallpapers.json";
import { images } from "@/theme/assets";
import { spacing } from "@/theme/tokens";

type Wallpaper = {
  id: string;
  src: string;
  filename: string;
  titleEn: string;
  titleHi: string;
};

const wallpapers = catalog.wallpapers as Wallpaper[];

export default function WallpapersScreen() {
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const [sharingId, setSharingId] = useState<string | null>(null);

  const shareWallpaper = useCallback(
    async (wp: Wallpaper) => {
      if (sharingId) return;
      setSharingId(wp.id);
      const title = lang === "hi" ? wp.titleHi : wp.titleEn;
      const remote = siteUrl(wp.src);
      try {
        const FileSystem = await import("expo-file-system/legacy");
        const dest = `${FileSystem.cacheDirectory}${wp.filename}`;
        const downloaded = await FileSystem.downloadAsync(remote, dest);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloaded.uri, {
            mimeType: "image/png",
            dialogTitle: t("wallpapersShare"),
          });
        } else {
          await Share.share({
            message: `${title}\n${remote}`,
            url: downloaded.uri,
          });
        }
      } catch {
        await Share.share({ message: `${title}\n${remote}` }).catch(() => undefined);
      } finally {
        setSharingId(null);
      }
    },
    [lang, sharingId, t]
  );

  return (
    <Screen atmosphere="soft" padded={false} edges={["left", "right"]}>
      <FlatList
        data={wallpapers}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Rise>
            <PageHero
              fullBleed
              backFallback="/(tabs)/practise"
              image={images.krishnaGlade}
              eyebrow={t("wallpapersEyebrow")}
              title={t("wallpapersTitle")}
              intro={t("wallpapersIntro")}
              meta={
                <Text variant="muted" color="rgba(255,255,255,0.72)">
                  {t("wallpapersMeta")}
                </Text>
              }
            />
          </Rise>
        }
        ListFooterComponent={
          <Text variant="muted" style={styles.credit}>
            {t("wallpapersCredit")}
          </Text>
        }
        renderItem={({ item, index }) => {
          const title = lang === "hi" ? item.titleHi : item.titleEn;
          const uri = siteUrl(item.src);
          const busy = sharingId === item.id;
          return (
            <Rise delay={Math.min(index * 30, 240)} style={styles.cardWrap}>
              <Panel style={{ borderColor: colors.line, padding: 0, overflow: "hidden" }}>
                <View style={styles.imageFrame}>
                  <Image source={{ uri }} style={styles.image} resizeMode="cover" />
                </View>
                <View style={styles.cardBody}>
                  <Text variant="title" style={styles.cardTitle}>
                    {title}
                  </Text>
                  <View style={styles.cardActions}>
                    <Button
                      label={busy ? "…" : t("wallpapersShare")}
                      onPress={() => void shareWallpaper(item)}
                      disabled={busy}
                    />
                    {busy ? (
                      <ActivityIndicator color={colors.brassSoft} style={styles.spinner} />
                    ) : null}
                  </View>
                </View>
              </Panel>
            </Rise>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl,
  },
  cardWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  imageFrame: {
    aspectRatio: 9 / 16,
    width: "100%",
    backgroundColor: "#0e1420",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  cardBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  spinner: {
    marginLeft: spacing.xs,
  },
  credit: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    fontSize: 13,
    lineHeight: 18,
  },
});