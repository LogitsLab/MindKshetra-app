import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { Hairline } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { userApi } from "@/api/endpoints";
import { spacing } from "@/theme/tokens";

type AchievementsResponse = Awaited<ReturnType<typeof userApi.achievements>>;

export default function AchievementsScreen() {
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const { isSignedIn, isAnonymous } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const L = lang === "hi" ? "hi" : "en";

  const load = useCallback(async () => {
    if (!isSignedIn || isAnonymous) {
      setLoading(false);
      return;
    }
    try {
      setData(await userApi.achievements());
    } catch {
      setData(null);
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

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text variant="eyebrow" color={colors.brassSoft}>
          {L === "hi" ? "साधक मार्ग" : "SEEKER PATH"}
        </Text>
        <Text variant="display" style={{ marginTop: spacing.xs }}>
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

        {(data?.achievements ?? []).map((a) => (
          <Panel key={a.id} style={{ marginBottom: spacing.sm }}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="title">{L === "hi" ? a.nameHi : a.nameEn}</Text>
                <Text variant="soft" style={{ marginTop: 4 }}>
                  {L === "hi" ? a.lineHi : a.lineEn}
                </Text>
                <Text variant="muted" style={{ marginTop: 6 }}>
                  {a.progress}/{a.target}
                  {a.unlocked
                    ? L === "hi"
                      ? " · प्राप्त"
                      : " · unlocked"
                    : ""}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.barTrack,
                { backgroundColor: colors.hairline ?? "rgba(255,255,255,0.08)" },
              ]}
            >
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.min(100, (a.progress / a.target) * 100)}%`,
                    backgroundColor: colors.brass,
                  },
                ]}
              />
            </View>
          </Panel>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },
  row: { flexDirection: "row", gap: spacing.md },
  barTrack: { height: 4, borderRadius: 2, marginTop: spacing.sm, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
});
