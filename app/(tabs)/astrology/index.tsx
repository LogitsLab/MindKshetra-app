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
  const { t } = useLanguage();
  const { isSignedIn } = useAuth();
  const { panchang, loading: panchangLoading, error: panchangError, reload: reloadPanchang } =
    usePanchang();
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
    {
      id: "astro-panchang",
      label: t("panchangTitle"),
      symbol: "☼",
      onPress: () => router.push("/panchang"),
    },
    {
      id: "astro-muhurat",
      label: t("astroShortcutMuhurat"),
      symbol: "◷",
      onPress: () => router.push("/astrology/muhurat"),
    },
    {
      id: "astro-horoscope",
      label: t("astroShortcutHoroscope"),
      symbol: "⌖",
      onPress: () => router.push("/astrology/horoscope"),
    },
    {
      id: "astro-transits",
      label: t("astroShortcutTransits"),
      symbol: "↗",
      onPress: () => router.push("/astrology/transits"),
    },
    {
      id: "astro-charts",
      label: t("astroShortcutCharts"),
      symbol: "◇",
      onPress: () => router.push("/astrology/members"),
    },
    {
      id: "astro-milan",
      label: t("milanTitle"),
      symbol: "∞",
      onPress: () => router.push("/astrology/milan"),
    },
  ];
  const entries = [
    {
      title: t("astroHubIncognitoTitle"),
      body: t("astroHubIncognitoBody"),
      symbol: "◉",
      onPress: () => router.push("/astrology/incognito"),
    },
    {
      title: t("astroHubMembersTitle"),
      body: t("astroHubMembersBody"),
      symbol: "♙",
      onPress: () => router.push("/astrology/members"),
    },
    {
      title: t("milanTitle"),
      body: t("astroHubMilanBody"),
      symbol: "∞",
      onPress: () => router.push("/astrology/milan"),
    },
    {
      title: t("panchangTitle"),
      body: t("astroHubPanchangBody"),
      symbol: "☾",
      onPress: () => router.push("/panchang"),
    },
  ];

  const tithiValue = panchang?.tithi
    ? panchang.tithi
    : panchangError
      ? t("panchangUnavailable")
      : t("astroHubTithiLoading");

  return (
    <Screen testID="screen-astrology" atmosphere="strong">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text variant="display" style={styles.title}>
            {t("astroTitle")}
          </Text>
          <Text variant="sanskrit" style={{ color: colors.brass }}>
            ज्योतिष
          </Text>
        </View>

        <Pressable
          onPress={() =>
            panchangError && !panchang ? reloadPanchang() : router.push("/panchang")
          }
          accessibilityRole="button"
          accessibilityLabel={`${t("astroHubTithi")}. ${tithiValue}`}
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
              {t("astroHubTithi")}
            </Text>
            <Text variant="body" style={styles.tithiValue} numberOfLines={1}>
              {panchangLoading && !panchang ? t("astroHubTithiLoading") : tithiValue}
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
              key={shortcut.id}
              testID={shortcut.id}
              onPress={shortcut.onPress}
              accessibilityRole="button"
              accessibilityLabel={shortcut.label}
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
              accessibilityRole="button"
              accessibilityLabel={`${entry.title}. ${entry.body}`}
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
              {t("astroHubSignIn")}
            </Text>
          </Pressable>
        ) : null}

        {members.length > 0 ? (
          <View style={{ marginTop: spacing.xl }}>
            <Text variant="eyebrow">{t("astroHubRecent")}</Text>
            <Panel style={{ marginTop: spacing.sm }} padded={false}>
              {members.slice(0, 3).map((m, i) => (
                <Pressable
                  key={m.id}
                  onPress={() => router.push(`/astrology/members/${m.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={m.name}
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
