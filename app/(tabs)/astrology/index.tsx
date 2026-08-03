import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { astrologyApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { usePanchang } from "@/hooks/usePanchang";
import { radii, spacing } from "@/theme/tokens";
import type { AstrologyMember } from "@/types";

export default function AstrologyHub() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const { isSignedIn } = useAuth();
  const { panchang } = usePanchang();
  const [members, setMembers] = useState<AstrologyMember[]>([]);
  const [hubError, setHubError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    astrologyApi
      .members()
      .then((r) => {
        setMembers(r.members ?? []);
        setHubError(null);
      })
      .catch((e) => setHubError((e as Error).message));
  }, [isSignedIn]);

  const shortcuts = [
    { label: "Panchang", symbol: "☼", onPress: () => router.push("/panchang") },
    { label: "Muhurats", symbol: "◷", onPress: () => router.push("/astrology/muhurat") },
    { label: "Horoscope", symbol: "⌖", onPress: () => router.push("/astrology/horoscope") },
    { label: "Transits", symbol: "↗", onPress: () => router.push("/astrology/transits") },
    { label: "Charts", symbol: "◇", onPress: () => router.push("/astrology/members") },
    { label: "Milan", symbol: "∞", onPress: () => router.push("/astrology/milan") },
  ];
  const entries = [
    {
      title: lang === "hi" ? "गुप्त कुंडली" : "Incognito Chart",
      body: lang === "hi" ? "एक बार की गणना" : "Single-use lookup",
      symbol: "◉",
      onPress: () => router.push("/astrology/incognito"),
    },
    {
      title: lang === "hi" ? "सहेजे सदस्य" : "Saved Members",
      body: lang === "hi" ? "आपका निकट वृत्त" : "Your inner circle",
      symbol: "♙",
      onPress: () => router.push("/astrology/members"),
    },
    {
      title: lang === "hi" ? "कुंडली मिलान" : "Kundli Milan",
      body: lang === "hi" ? "अनुकूलता मिलान" : "Compatibility match",
      symbol: "∞",
      onPress: () => router.push("/astrology/milan"),
    },
    {
      title: lang === "hi" ? "आज का पंचांग" : "Today's Panchang",
      body: lang === "hi" ? "वैदिक पंचांग" : "Vedic almanac",
      symbol: "☾",
      onPress: () => router.push("/panchang"),
    },
  ];

  return (
    <Screen atmosphere="strong">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text variant="display" style={styles.title}>
            Astrology
          </Text>
          <Text variant="sanskrit" style={{ color: colors.brass }}>
            ज्योतिष
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/panchang")}
          style={({ pressed }) => [
            styles.tithi,
            {
              borderColor: colors.line,
              backgroundColor: pressed ? colors.panelStrong : colors.panel,
            },
          ]}
        >
          <View style={[styles.tithiIcon, { borderColor: colors.line }]}>
            <Text style={{ color: colors.brassSoft, fontSize: 22 }}>☾</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="eyebrow">
              {lang === "hi" ? "आज की तिथि" : "Today's Tithi"}
            </Text>
            <Text variant="body" style={styles.tithiValue} numberOfLines={1}>
              {panchang?.tithi ?? (lang === "hi" ? "तिथि लोड हो रही है…" : "Loading today's sky…")}
            </Text>
          </View>
          <Text style={{ color: colors.brass, fontSize: 24 }}>›</Text>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shortcuts}
          style={styles.shortcutScroller}
        >
          {shortcuts.map((shortcut) => (
            <Pressable
              key={shortcut.label}
              onPress={shortcut.onPress}
              style={styles.shortcut}
            >
              <View
                style={[
                  styles.shortcutIcon,
                  { borderColor: colors.line, backgroundColor: colors.panel },
                ]}
              >
                <Text style={{ color: colors.brassSoft, fontSize: 22 }}>
                  {shortcut.symbol}
                </Text>
              </View>
              <Text variant="muted" style={styles.shortcutLabel}>
                {shortcut.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {hubError ? (
          <Panel style={{ marginBottom: spacing.md }}>
            <Text variant="soft" color={colors.danger}>
              {hubError}
            </Text>
          </Panel>
        ) : null}

        <View style={styles.entryGrid}>
          {entries.map((entry) => (
            <Pressable
              key={entry.title}
              onPress={entry.onPress}
              style={({ pressed }) => [
                styles.entry,
                {
                  borderColor: pressed ? colors.brass : colors.line,
                  backgroundColor: pressed ? colors.panelStrong : colors.panel,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Text style={{ color: colors.brassSoft, fontSize: 25 }}>{entry.symbol}</Text>
              <View>
                <Text variant="body" style={styles.entryTitle}>{entry.title}</Text>
                <Text variant="muted" style={{ marginTop: 3 }}>{entry.body}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {!isSignedIn ? (
          <Pressable onPress={() => router.push("/account")}>
            <Text variant="muted" style={styles.signIn}>
              {lang === "hi"
                ? "सदस्य सहेजने के लिए साइन इन करें"
                : "Sign in to save members"}
            </Text>
          </Pressable>
        ) : null}

        {members.length > 0 ? (
          <View style={{ marginTop: spacing.xl }}>
            <Text variant="eyebrow">{lang === "hi" ? "हाल के सदस्य" : "Recent members"}</Text>
            <Panel style={{ marginTop: spacing.sm }} padded={false}>
              {members.slice(0, 3).map((m, i) => (
                <Pressable
                  key={m.id}
                  onPress={() => router.push(`/astrology/members/${m.id}`)}
                  style={[
                    styles.member,
                    {
                      borderBottomColor: colors.hairline,
                      borderBottomWidth:
                        i === Math.min(members.length, 3) - 1
                          ? 0
                          : StyleSheet.hairlineWidth * 2,
                    },
                  ]}
                >
                  <View>
                    <Text variant="body" style={styles.memberName}>{m.name}</Text>
                    <Text variant="muted" style={{ marginTop: 2 }}>
                      {m.placeLabel ?? m.dob}
                    </Text>
                  </View>
                  <Text style={{ color: colors.brass }}>›</Text>
                </Pressable>
              ))}
            </Panel>
          </View>
        ) : null}

        {members.length >= 2 ? (
          <Pressable onPress={() => router.push("/astrology/milan")} style={styles.milanLink}>
            <Text variant="muted" color={colors.brassSoft}>
              {t("milanTitle")} · {t("milanHubBody")}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.contentBottom,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: "Fraunces_500Medium",
    fontSize: 31,
    lineHeight: 38,
  },
  tithi: {
    minHeight: 74,
    borderRadius: 37,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  tithiIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tithiValue: {
    marginTop: 2,
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
  },
  shortcutScroller: {
    marginHorizontal: -spacing.md,
    marginVertical: spacing.xl,
  },
  shortcuts: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  shortcut: {
    width: 68,
    alignItems: "center",
    gap: spacing.sm,
  },
  shortcutIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  entryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  entry: {
    width: "47.5%",
    aspectRatio: 1,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.lg,
    justifyContent: "space-between",
  },
  entryTitle: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    lineHeight: 20,
  },
  signIn: {
    marginTop: spacing.lg,
    textAlign: "center",
  },
  member: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
  },
  milanLink: {
    marginTop: spacing.md,
    alignItems: "center",
  },
});
