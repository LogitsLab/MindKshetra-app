import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { userApi } from "@/api/endpoints";
import { spacing } from "@/theme/tokens";

type Range = "daily" | "weekly" | "monthly" | "yearly";

export default function ProgressScreen() {
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const { isSignedIn, isAnonymous } = useAuth();
  const router = useRouter();
  const [range, setRange] = useState<Range>("monthly");
  const [data, setData] = useState<Awaited<
    ReturnType<typeof userApi.progressSummary>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const L = lang === "hi" ? "hi" : "en";

  const load = useCallback(async () => {
    if (!isSignedIn || isAnonymous) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(await userApi.progressSummary(range));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, isAnonymous, range]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isSignedIn || isAnonymous) {
    return (
      <Screen>
        <View style={styles.pad}>
          <Text variant="title">{L === "hi" ? "प्रगति" : "Progress"}</Text>
          <Text variant="soft" style={{ marginTop: spacing.sm }}>
            {L === "hi"
              ? "साइन इन करें ताकि प्रगति सहेजी जाए।"
              : "Sign in to sync your practice progress."}
          </Text>
          <Pressable onPress={() => router.push("/account")} style={{ marginTop: spacing.lg }}>
            <Text color={colors.brass}>{L === "hi" ? "खाता" : "Account"}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text variant="display">{L === "hi" ? "प्रगति" : "Progress"}</Text>
        {data?.seeker ? (
          <Text variant="soft" style={{ marginTop: spacing.sm }}>
            {L === "hi" ? data.seeker.labelHi : data.seeker.labelEn} · Level{" "}
            {data.seeker.level}
          </Text>
        ) : null}

        <View style={styles.chips}>
          {(["daily", "weekly", "monthly", "yearly"] as Range[]).map((r) => (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              style={[
                styles.chip,
                {
                  borderColor: range === r ? colors.brass : colors.line,
                  backgroundColor: colors.field,
                },
              ]}
            >
              <Text variant="muted" color={range === r ? colors.brassSoft : colors.textMuted}>
                {r}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.xl }} />
        ) : data ? (
          <>
            <View style={styles.stats}>
              <Stat
                label={L === "hi" ? "सत्र" : "Sessions"}
                value={String(data.sessions)}
                colors={colors}
              />
              <Stat
                label={L === "hi" ? "मिनट" : "Minutes"}
                value={String(data.durationMinutes)}
                colors={colors}
              />
              <Stat
                label={L === "hi" ? "मंत्र" : "Mantras"}
                value={String(data.mantras)}
                colors={colors}
              />
            </View>

            <Panel style={{ marginTop: spacing.lg }}>
              <Text variant="eyebrow">{L === "hi" ? "स्ट्रिक" : "STREAK"}</Text>
              <Text variant="title" style={{ marginTop: spacing.sm }}>
                {data.visitStreak.current}{" "}
                {L === "hi" ? "दिन वर्तमान" : "days current"}
              </Text>
              <Text variant="soft">
                {L === "hi" ? "सबसे लंबी" : "Longest"}: {data.visitStreak.longest}
              </Text>
            </Panel>

            <Panel style={{ marginTop: spacing.md }}>
              <Text variant="eyebrow">
                {L === "hi" ? "वितरण" : "DISTRIBUTION"}
              </Text>
              {(
                [
                  ["meditation", data.distribution.meditation],
                  ["japa", data.distribution.japa],
                  ["reading", data.distribution.reading],
                  ["other", data.distribution.other],
                ] as const
              ).map(([k, v]) => (
                <View key={k} style={styles.distRow}>
                  <Text variant="body" style={{ flex: 1 }}>
                    {k}
                  </Text>
                  <Text variant="muted">{v}%</Text>
                </View>
              ))}
            </Panel>
          </>
        ) : (
          <Text variant="soft" style={{ marginTop: spacing.lg }}>
            {L === "hi" ? "प्रगति लोड नहीं हुई।" : "Could not load progress."}
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

function Stat({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { brass: string; field: string; line: string };
}) {
  return (
    <View
      style={[
        styles.stat,
        { borderColor: colors.line, backgroundColor: colors.field },
      ]}
    >
      <Text variant="title" color={colors.brass}>
        {value}
      </Text>
      <Text variant="muted">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.lg },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  stats: { flexDirection: "row", gap: 8, marginTop: spacing.lg },
  stat: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
  },
  distRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
  },
});
