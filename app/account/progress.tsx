import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { userApi } from "@/api/endpoints";
import { radii, spacing } from "@/theme/tokens";

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
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <Text variant="eyebrow" color={colors.brassSoft}>
          {L === "hi" ? "निजी पहचान" : "PRIVATE RECOGNITION"}
        </Text>
        <Text variant="display" color={colors.brassSoft} style={styles.pageTitle}>
          {L === "hi" ? "मेरी प्रगति" : "My Progress"}
        </Text>
        {data?.seeker ? (
          <Text variant="soft" style={styles.seekerLine}>
            {L === "hi" ? data.seeker.labelHi : data.seeker.labelEn} · Level{" "}
            {data.seeker.level}
          </Text>
        ) : null}

        <View style={[styles.chips, { backgroundColor: colors.field, borderColor: colors.line }]}>
          {(["daily", "weekly", "monthly", "yearly"] as Range[]).map((r) => (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              style={[
                styles.chip,
                {
                  backgroundColor: range === r ? colors.surfaceHover : "transparent",
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
            <View style={[styles.stats, { borderColor: colors.line }]}>
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

            <View style={styles.streakSection}>
              <View
                style={[
                  styles.streakHalo,
                  { borderColor: "rgba(201,162,39,0.2)", backgroundColor: "rgba(201,162,39,0.05)" },
                ]}
              >
                <View style={[styles.streakRing, { borderColor: colors.brass }]}>
                  <View style={[styles.streakInner, { borderColor: colors.line, backgroundColor: colors.panel }]}>
                    <Text variant="display" color={colors.brassSoft} style={styles.streakNumber}>
                      {data.visitStreak.current}
                    </Text>
                    <Text variant="eyebrow" color={colors.brassSoft}>
                      {L === "hi" ? "दिन" : "DAYS"}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.streakPair}>
                <View style={styles.streakMetric}>
                  <Text variant="eyebrow">{L === "hi" ? "वर्तमान" : "CURRENT"}</Text>
                  <Text variant="title" color={colors.brassSoft}>
                    {data.visitStreak.current} {L === "hi" ? "दिन" : "days"}
                  </Text>
                </View>
                <View style={[styles.streakMetric, styles.streakMetricBorder, { borderColor: colors.hairline }]}>
                  <Text variant="eyebrow">{L === "hi" ? "सर्वश्रेष्ठ" : "BEST"}</Text>
                  <Text variant="title">
                    {data.visitStreak.longest} {L === "hi" ? "दिन" : "days"}
                  </Text>
                </View>
              </View>
              <Text variant="soft" style={styles.graceCopy}>
                Return when ready — grace days exist.
              </Text>
            </View>

            <View style={styles.distribution}>
              <Text variant="title" color={colors.brassSoft}>
                {L === "hi" ? "अभ्यास वितरण" : "Practice distribution"}
              </Text>
              {(
                [
                  ["meditation", data.distribution.meditation],
                  ["japa", data.distribution.japa],
                  ["reading", data.distribution.reading],
                  ["other", data.distribution.other],
                ] as const
              ).map(([k, v]) => (
                <View key={k} style={styles.distBlock}>
                  <View style={styles.distRow}>
                    <Text variant="eyebrow" style={styles.distLabel}>{k}</Text>
                    <Text variant="muted">{v}%</Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: colors.hairline }]}>
                    <View style={[styles.barFill, { width: `${v}%`, backgroundColor: colors.brass }]} />
                  </View>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => router.push("/account/achievements")}
              style={[styles.linkRow, { borderColor: colors.line }]}
            >
              <Text variant="eyebrow">{L === "hi" ? "उपलब्धियाँ" : "ACHIEVEMENTS"}</Text>
              <Text color={colors.brassSoft}>→</Text>
            </Pressable>
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
      style={styles.stat}
    >
      <Text variant="display" color={colors.brass} style={styles.statValue}>
        {value}
      </Text>
      <Text variant="muted">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingTop: spacing.md, paddingBottom: spacing.xxl },
  pageTitle: { marginTop: spacing.xs },
  seekerLine: { marginTop: spacing.xs },
  chips: {
    flexDirection: "row",
    marginTop: spacing.lg,
    padding: 4,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  stats: {
    flexDirection: "row",
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: { fontSize: 25 },
  streakSection: { alignItems: "center", marginTop: spacing.xl },
  streakHalo: {
    width: 248,
    height: 248,
    borderRadius: 124,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  streakRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  streakInner: {
    width: 188,
    height: 188,
    borderRadius: 94,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  streakNumber: { fontSize: 52, lineHeight: 58 },
  streakPair: { flexDirection: "row", width: "100%", marginTop: spacing.xl },
  streakMetric: { flex: 1, alignItems: "center", gap: spacing.xs },
  streakMetricBorder: { borderLeftWidth: StyleSheet.hairlineWidth },
  graceCopy: {
    textAlign: "center",
    fontStyle: "italic",
    marginTop: spacing.xl,
  },
  distribution: { marginTop: spacing.xxl },
  distBlock: { marginTop: spacing.lg },
  distRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  distLabel: { textTransform: "uppercase" },
  barTrack: { height: 3, marginTop: spacing.sm, overflow: "hidden" },
  barFill: { height: 3 },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
