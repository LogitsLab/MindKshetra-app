import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { MoodIcon } from "@/components/MoodIcon";
import { contentApi, astrologyApi } from "@/api/endpoints";
import { moods } from "@/data/moods";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { moodAccent } from "@/theme/assets";
import { radii, spacing } from "@/theme/tokens";
import type { Mood } from "@/types";

type OrderMode = "static" | "loading" | "chart" | "unavailable";

export default function MoodScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const { isSignedIn } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orderMode, setOrderMode] = useState<OrderMode>("static");
  const [orderedMoods, setOrderedMoods] = useState<Mood[]>(moods);
  const [hasChartOrder, setHasChartOrder] = useState(false);

  const chartActive = orderMode === "chart";
  const displayMoods = chartActive ? orderedMoods : moods;

  async function enableChartOrder() {
    if (hasChartOrder) {
      setOrderMode("chart");
      return;
    }
    setOrderMode("loading");
    try {
      const { members } = await astrologyApi.members();
      const member =
        members?.find((m) => m.relationship === "self") ?? members?.[0];
      if (!member) throw new Error();
      const { order } = await contentApi.moodOrder(member.id);
      if (!order?.length) throw new Error();
      const byId = new Map(moods.map((m) => [m.id, m]));
      const next = order
        .map((id) => byId.get(id))
        .filter((m): m is Mood => Boolean(m));
      for (const mood of moods) {
        if (!next.includes(mood)) next.push(mood);
      }
      setOrderedMoods(next);
      setHasChartOrder(true);
      setOrderMode("chart");
    } catch {
      setOrderMode("unavailable");
    }
  }

  return (
    <Screen testID="screen-mood" atmosphere="soft">
      <View style={styles.heading}>
        <Text variant="display" style={styles.title}>
          {lang === "hi" ? "आप कैसा महसूस कर रहे हैं?" : "How are you feeling?"}
        </Text>
        <Text variant="soft" style={styles.subtitle}>
          {lang === "hi"
            ? "जहाँ आप हैं, वहीं मिलने वाले श्लोक।"
            : "Verses that meet you where you are."}
        </Text>
      </View>

      {isSignedIn ? (
        <View style={styles.orderRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: chartActive }}
            disabled={orderMode === "loading"}
            onPress={() =>
              chartActive ? setOrderMode("static") : void enableChartOrder()
            }
            style={({ pressed }) => [
              styles.orderToggle,
              {
                borderColor: chartActive ? colors.brass : colors.line,
                opacity: orderMode === "loading" || pressed ? 0.6 : 1,
              },
            ]}
          >
            <Text
              variant="muted"
              style={{
                color: chartActive ? colors.brassSoft : colors.textMuted,
                fontSize: 12,
              }}
            >
              {orderMode === "loading"
                ? t("moodChartOrderLoading")
                : t("moodChartOrderToggle")}
            </Text>
          </Pressable>
          {chartActive ? (
            <Text variant="muted" style={styles.orderHint}>
              {t("moodChartOrderOn")}
            </Text>
          ) : null}
          {orderMode === "unavailable" ? (
            <Text variant="muted" style={styles.orderHint}>
              {t("moodChartOrderUnavailable")}
            </Text>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={displayMoods}
        keyExtractor={(m) => m.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const selected = selectedId === item.id;
          const accent = moodAccent[item.id] ?? colors.brass;
          return (
            <Pressable
              testID={`mood-${item.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                setSelectedId(item.id);
                requestAnimationFrame(() =>
                  router.push(`/(tabs)/mood/${item.id}`)
                );
              }}
              style={({ pressed }) => [
                styles.tile,
                {
                  backgroundColor:
                    selected || pressed ? colors.panelStrong : colors.panel,
                  borderColor: selected ? accent : colors.line,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View
                style={[
                  styles.iconWell,
                  { backgroundColor: `${accent}18`, borderColor: `${accent}44` },
                ]}
              >
                <MoodIcon id={item.id} size={32} color={accent} />
              </View>
              <Text variant="body" style={styles.label}>
                {item.label}
              </Text>
              <Text variant="sanskrit" style={[styles.hindi, { color: colors.textSoft }]}>
                {item.labelHi}
              </Text>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    textAlign: "center",
    fontFamily: "Fraunces_500Medium",
    fontSize: 30,
    lineHeight: 38,
  },
  subtitle: {
    marginTop: spacing.sm,
    textAlign: "center",
    fontFamily: "Fraunces_500Medium",
    fontStyle: "italic",
  },
  orderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  orderToggle: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "center",
  },
  orderHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.contentBottom,
  },
  row: {
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    minHeight: 148,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWell: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: spacing.sm,
    textAlign: "center",
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    lineHeight: 20,
  },
  hindi: {
    marginTop: 2,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
  },
});
