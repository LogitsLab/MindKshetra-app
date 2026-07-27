import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Hairline } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { userApi } from "@/api/endpoints";
import { spacing, radii } from "@/theme/tokens";

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const { isSignedIn } = useAuth();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!isSignedIn) return;
    userApi
      .streak()
      .then((s) => setStreak(s.current ?? 0))
      .catch(() => undefined);
  }, [isSignedIn]);

  const paths = [
    {
      href: "/(tabs)/explore" as const,
      title: t("navExplore"),
      body:
        lang === "hi"
          ? "अध्याय दर अध्याय गंगा की धारा"
          : "Walk the Gita chapter by chapter",
    },
    {
      href: "/(tabs)/mood" as const,
      title: t("navMood"),
      body:
        lang === "hi"
          ? "आज के भाव के लिए श्लोक"
          : "Verses matched to how you feel",
    },
    {
      href: "/(tabs)/astrology" as const,
      title: t("navAstrology"),
      body:
        lang === "hi"
          ? "ज्योतिष के साथ पठन"
          : "Read the Gita beside your chart",
    },
  ];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingTop: spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text variant="eyebrow">MindKshetra</Text>
            <Text variant="display" style={{ marginTop: spacing.xs }}>
              MindKshetra
            </Text>
            <Text variant="soft" style={{ marginTop: spacing.sm, maxWidth: 320 }}>
              {lang === "hi"
                ? "गीता का क्षेत्र — पठन, मनोदशा, माधव, और ज्योतिष।"
                : "A field for the Gita — reading, mood, Madhav, and jyotish."}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/account")}
            style={[styles.avatar, { borderColor: colors.line, backgroundColor: colors.surface }]}
          >
            <Text style={{ color: colors.brassSoft, fontFamily: "Sora_600SemiBold" }}>A</Text>
          </Pressable>
        </View>

        {streak > 0 ? (
          <Text variant="muted" style={{ marginTop: spacing.md }}>
            {lang === "hi" ? `${streak} दिन की धारा` : `${streak}-day streak`}
          </Text>
        ) : null}

        <Pressable
          onPress={() => router.push("/verse-of-the-day")}
          style={[
            styles.votd,
            { backgroundColor: colors.panel, borderColor: colors.line },
          ]}
        >
          <Text variant="eyebrow">Verse of the day</Text>
          <Text variant="title" style={{ marginTop: spacing.sm }}>
            {lang === "hi" ? "आज का श्लोक" : "Today’s verse"}
          </Text>
          <Text variant="soft" style={{ marginTop: spacing.xs }}>
            {lang === "hi" ? "एक श्लोक, एक दिन" : "One verse to sit with"}
          </Text>
        </Pressable>

        <Hairline style={{ marginVertical: spacing.lg }} />

        {paths.map((p) => (
          <Pressable
            key={p.href}
            onPress={() => router.push(p.href)}
            style={({ pressed }) => [
              styles.path,
              {
                borderColor: colors.hairline,
                backgroundColor: pressed ? colors.surfaceHover : "transparent",
              },
            ]}
          >
            <Text variant="title">{p.title}</Text>
            <Text variant="soft" style={{ marginTop: 4 }}>
              {p.body}
            </Text>
          </Pressable>
        ))}

        <View style={styles.rowLinks}>
          <Pressable onPress={() => router.push("/favorites")}>
            <Text color={colors.brassSoft}>{lang === "hi" ? "पसंदीदा" : "Favorites"}</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/madhav")}>
            <Text color={colors.brassSoft}>{t("navMadhav")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  votd: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  path: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  rowLinks: {
    marginTop: spacing.xl,
    flexDirection: "row",
    gap: spacing.lg,
  },
});
