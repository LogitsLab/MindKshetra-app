import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  chapterMoral,
  chapterSubtitle,
  chapterTitle,
  getChapterMetas,
} from "@/data/chapters";
import { progressApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useFocusRefresh } from "@/hooks/useFocusRefresh";
import { getGuestProgress } from "@/storage/local";
import { radii, spacing } from "@/theme/tokens";

export default function ExploreScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const { isSignedIn } = useAuth();
  const [q, setQ] = useState("");
  const [continueCursor, setContinueCursor] = useState<{
    chapter: number;
    verse: number;
  } | null>(null);
  const chapters = useMemo(() => {
    const all = getChapterMetas();
    if (!q.trim()) return all;
    const needle = q.trim().toLowerCase();
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        (c.name_hi ?? "").includes(q) ||
        c.name_sanskrit.includes(q) ||
        String(c.number).includes(needle)
    );
  }, [q]);

  useFocusRefresh(
    "progress",
    async (isActive) => {
      try {
        const data = isSignedIn ? await progressApi.get() : await getGuestProgress();
        if (isActive()) setContinueCursor(data.cursor ?? null);
      } catch (e) {
        if (isActive()) setContinueCursor(null);
        throw e;
      }
    },
    { resetKey: String(isSignedIn) }
  );

  return (
    <Screen>
      <ScreenHeader
        title={lang === "hi" ? "अन्वेषण" : "Explore"}
        subtitle={
          lang === "hi" ? "अठारह अध्याय, एक मार्ग" : "Eighteen chapters, one path"
        }
      />
      <Panel style={{ marginTop: spacing.md, padding: 0 }} padded={false}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={lang === "hi" ? "अध्याय खोजें" : "Search chapters"}
          placeholderTextColor={colors.textMuted}
          style={[styles.search, { color: colors.text }]}
        />
      </Panel>
      {continueCursor ? (
        <View style={{ marginTop: spacing.md }}>
          <Button
            label={`${t("continueReading")} · ${continueCursor.chapter}.${continueCursor.verse}`}
            onPress={() => router.push(`/(tabs)/explore/${continueCursor.chapter}`)}
          />
        </View>
      ) : null}
      <FlatList
        data={chapters}
        keyExtractor={(c) => String(c.number)}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.sm }}
        contentContainerStyle={{
          gap: spacing.sm,
          paddingTop: spacing.md,
          paddingBottom: spacing.contentBottom,
        }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(tabs)/explore/${item.number}`)}
            style={({ pressed }) => [
              styles.tile,
              {
                backgroundColor: pressed ? colors.surfaceHover : colors.surface,
                borderColor: colors.line,
              },
            ]}
          >
            <View style={[styles.progress, { borderColor: colors.brass }]}>
              <Text
                color={colors.brassSoft}
                style={{ fontFamily: "Sora_600SemiBold", fontSize: 13 }}
              >
                {item.number}
              </Text>
            </View>
            <Text
              variant="title"
              style={{ fontSize: 16, marginTop: spacing.sm }}
              numberOfLines={2}
            >
              {chapterTitle(item, lang)}
            </Text>
            {chapterSubtitle(item, lang) ? (
              <Text variant="muted" style={{ marginTop: 4 }} numberOfLines={1}>
                {chapterSubtitle(item, lang)}
              </Text>
            ) : null}
            {chapterMoral(item, lang) ? (
              <Text variant="soft" style={{ marginTop: spacing.sm }} numberOfLines={3}>
                {chapterMoral(item, lang)}
              </Text>
            ) : null}
            <Text variant="muted" style={{ marginTop: spacing.sm }} numberOfLines={1}>
              {item.verses_count} {lang === "hi" ? "श्लोक" : "verses"} →
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: "Sora_400Regular",
    fontSize: 16,
  },
  tile: {
    flex: 1,
    minHeight: 180,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.md,
  },
  progress: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
