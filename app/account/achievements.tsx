import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Hairline } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { userApi } from "@/api/endpoints";
import { radii, spacing } from "@/theme/tokens";

type AchievementsResponse = Awaited<ReturnType<typeof userApi.achievements>>;

export default function AchievementsScreen() {
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const { isSignedIn, isAnonymous } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const L = lang === "hi" ? "hi" : "en";

  const load = useCallback(async () => {
    if (!isSignedIn || isAnonymous) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      setData(await userApi.achievements());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, isAnonymous]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isSignedIn || isAnonymous) {
    return (
      <Screen>
        <View style={styles.pad}>
          <Text variant="title">
            {L === "hi" ? "उपलब्धियाँ" : "Achievements"}
          </Text>
          <Text variant="soft" style={{ marginTop: spacing.sm }}>
            {L === "hi"
              ? "साइन इन करें ताकि आपकी उपलब्धियाँ सहेजी जाएँ।"
              : "Sign in to keep your achievements across devices."}
          </Text>
          <Pressable onPress={() => router.push("/account")} style={{ marginTop: spacing.lg }}>
            <Text variant="body" color={colors.brass}>
              {L === "hi" ? "खाता खोलें" : "Open account"}
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.xxl }} />
      </Screen>
    );
  }

  const seeker = data?.seeker;

  if (error && !data) {
    return (
      <Screen>
        <View accessibilityRole="alert" style={styles.pad}>
          <Text variant="title">
            {L === "hi" ? "उपलब्धियाँ लोड नहीं हुईं" : "Couldn’t load achievements"}
          </Text>
          <Text variant="soft" style={{ marginTop: spacing.sm }}>
            {L === "hi"
              ? "कनेक्शन जाँचें और फिर कोशिश करें।"
              : "Check your connection and try again."}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={L === "hi" ? "फिर कोशिश करें" : "Retry achievements"}
            onPress={() => void load()}
            style={{ marginTop: spacing.lg }}
          >
            <Text color={colors.brassSoft}>{L === "hi" ? "फिर कोशिश करें" : "Retry"}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <Text variant="eyebrow" color={colors.brassSoft}>
          {L === "hi" ? "साधक मार्ग" : "SEEKER PATH"}
        </Text>
        <Text variant="display" color={colors.brassSoft} style={styles.pageTitle}>
          {seeker
            ? `${L === "hi" ? seeker.labelHi : seeker.labelEn} · ${
                L === "hi" ? "स्तर" : "Level"
              } ${seeker.level}`
            : L === "hi"
              ? "नवागंतुक"
              : "Newcomer"}
        </Text>
        <Text variant="soft" style={{ marginTop: spacing.sm }}>
          {L === "hi"
            ? "निजी पहचान — कोई लीडरबोर्ड नहीं।"
            : "Private recognition — no leaderboards."}
        </Text>

        <Hairline style={{ marginVertical: spacing.lg }} />

        <View style={styles.grid}>
          {(data?.achievements ?? []).map((a) => {
            const progress = Math.min(100, (a.progress / a.target) * 100);
            return (
              <View
                key={a.id}
                style={[
                  styles.card,
                  {
                    borderColor: colors.line,
                    backgroundColor: colors.panel,
                    opacity: a.unlocked ? 1 : 0.72,
                  },
                ]}
              >
                <View
                  style={[
                    styles.badge,
                    {
                      borderColor: a.unlocked ? colors.brass : colors.line,
                      backgroundColor: a.unlocked ? colors.surfaceHover : colors.field,
                    },
                  ]}
                >
                  <Text
                    variant="display"
                    color={a.unlocked ? colors.brassSoft : colors.textMuted}
                    style={styles.badgeGlyph}
                  >
                    {a.motif.toLowerCase().includes("lotus") ? "❖" : "◇"}
                  </Text>
                </View>
                <Text variant="title" style={styles.cardTitle}>
                  {L === "hi" ? a.nameHi : a.nameEn}
                </Text>
                <Text variant="muted" style={styles.cardLine}>
                  {L === "hi" ? a.lineHi : a.lineEn}
                </Text>
                <View style={styles.progressMeta}>
                  <Text variant="eyebrow">
                    {a.unlocked
                      ? L === "hi" ? "पूर्ण" : "COMPLETE"
                      : L === "hi" ? "प्रगति में" : "IN PROGRESS"}
                  </Text>
                  <Text variant="muted">{a.progress}/{a.target}</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: colors.hairline }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${progress}%`,
                        backgroundColor: a.unlocked ? colors.brass : colors.brassSoft,
                        opacity: a.unlocked ? 1 : 0.55,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingTop: spacing.md, paddingBottom: spacing.xxl },
  pageTitle: { marginTop: spacing.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  card: {
    width: "48.5%",
    minHeight: 280,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
  },
  badge: {
    width: 72,
    height: 72,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 22,
    transform: [{ rotate: "45deg" }],
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.md,
  },
  badgeGlyph: { transform: [{ rotate: "-45deg" }], fontSize: 32 },
  cardTitle: { fontSize: 17, lineHeight: 22, textAlign: "center" },
  cardLine: { textAlign: "center", marginTop: spacing.xs, flex: 1 },
  progressMeta: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  barTrack: { width: "100%", height: 4, borderRadius: 2, marginTop: spacing.sm, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
});
