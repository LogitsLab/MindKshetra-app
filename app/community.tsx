import React, { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { PageHero } from "@/components/PageHero";
import { Rise } from "@/components/Rise";
import { getApiUrl } from "@/api/client";
import { eventsApi } from "@/api/endpoints";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { COMMUNITY_ROUTE_TARGETS } from "@/data/community";
import {
  INSTAGRAM_URL,
  WHATSAPP_CHANNEL_FALLBACK,
  brandLinkRows,
} from "@/lib/brandLinks";
import { images } from "@/theme/assets";
import { spacing } from "@/theme/tokens";

const TELEGRAM = process.env.EXPO_PUBLIC_TELEGRAM_URL;

type CommunityLinks = {
  whatsapp: string | null;
  telegram: string | null;
  instagram: string | null;
  website: string | null;
};

function linkOrNull(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("https://") ? value : null;
}

export default function CommunityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const [attended, setAttended] = useState(false);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [attendanceError, setAttendanceError] = useState(false);
  const [remote, setRemote] = useState<CommunityLinks | null>(null);
  const [linksReady, setLinksReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${getApiUrl()}/api/community-links`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as Record<string, unknown>;
      })
      .then((data) => {
        if (cancelled) return;
        setRemote({
          whatsapp: linkOrNull(data.whatsapp),
          telegram: linkOrNull(data.telegram),
          instagram: linkOrNull(data.instagram),
          website: linkOrNull(data.website),
        });
      })
      .catch(() => {
        if (!cancelled) setRemote(null);
      })
      .finally(() => {
        if (!cancelled) setLinksReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const whatsapp = remote?.whatsapp ?? WHATSAPP_CHANNEL_FALLBACK;
  const telegram = remote?.telegram ?? TELEGRAM ?? null;
  const instagram = remote?.instagram ?? INSTAGRAM_URL;
  const followRows = brandLinkRows({ whatsapp, instagram }).map((row) => ({
    ...row,
    label:
      lang === "hi" && row.id === "whatsapp"
        ? "व्हाट्सऐप चैनल"
        : lang === "hi" && row.id === "instagram"
          ? `इंस्टाग्राम ${row.label.replace("Instagram ", "")}`
          : lang === "hi" && row.id === "website"
            ? "वेबसाइट"
            : lang === "hi" && row.id === "support"
              ? "सहयोग"
              : lang === "hi" && row.id === "privacy"
                ? "गोपनीयता"
                : row.label,
  }));

  async function markAttended() {
    setAttendanceBusy(true);
    setAttendanceError(false);
    const result = await eventsApi.send("sangha_attended", {
      source: "mobile_sangha",
    });
    if (result.ok) setAttended(true);
    else setAttendanceError(true);
    setAttendanceBusy(false);
  }

  return (
    <Screen atmosphere="soft" padded={false} edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <PageHero
            fullBleed
            backFallback="/(tabs)/home"
            image={images.pathCommunity}
            eyebrow={t("homeBlockSanghaTitle")}
            title={t("homeTogetherTitle")}
            intro={t("homeTogetherBlurb")}
          />
        </Rise>

        <Rise delay={40} style={{ marginTop: spacing.xl }}>
          <Panel>
            <Text variant="title" style={{ fontSize: 20 }}>
              {t("homeBlockSanghaTitle")}
            </Text>
            <Text variant="muted" style={{ marginTop: spacing.xs }}>
              {t("homeBlockSanghaBody")}
            </Text>
            <View style={styles.linkRow}>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={t("sanghaJoinWhatsApp")}
                onPress={() => {
                  void import("@/analytics/meta").then((m) =>
                    m.MetaEvents.joinCommunity()
                  );
                  void Linking.openURL(whatsapp);
                }}
              >
                <Text color={colors.brassSoft}>{t("sanghaJoinWhatsApp")}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Instagram"
                onPress={() => void Linking.openURL(instagram)}
              >
                <Text color={colors.brassSoft}>Instagram</Text>
              </Pressable>
              {telegram ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={t("sanghaJoinTelegram")}
                  onPress={() => void Linking.openURL(telegram)}
                >
                  <Text color={colors.brassSoft}>{t("sanghaJoinTelegram")}</Text>
                </Pressable>
              ) : null}
              {linksReady && !whatsapp && !telegram ? (
                <Text variant="muted">{t("sanghaChannelsSoon")}</Text>
              ) : null}
            </View>
            <View style={{ marginTop: spacing.md }}>
              <Button
                label={attended ? t("sanghaAttendedDone") : t("sanghaAttended")}
                variant={attended ? "ghost" : "primary"}
                onPress={() => void markAttended()}
                disabled={attended || attendanceBusy}
                loading={attendanceBusy}
              />
              {attendanceError ? (
                <Text
                  accessibilityRole="alert"
                  variant="soft"
                  color={colors.danger}
                  style={{ marginTop: spacing.sm }}
                >
                  {t("sanghaAttendanceFailed")}
                </Text>
              ) : null}
            </View>
          </Panel>
        </Rise>

        <Rise delay={60} style={{ marginTop: spacing.md }}>
          <Panel>
            <Text variant="title" style={{ fontSize: 18 }}>
              {lang === "hi" ? "हमसे जुड़ें" : "Follow us"}
            </Text>
            <View style={styles.linkRow}>
              {followRows.map((row) => (
                <Pressable
                  key={row.id}
                  accessibilityRole="link"
                  accessibilityLabel={row.label}
                  onPress={() => void Linking.openURL(row.href)}
                >
                  <Text color={colors.brassSoft}>{row.label}</Text>
                </Pressable>
              ))}
            </View>
          </Panel>
        </Rise>

        <Rise delay={80} style={{ marginTop: spacing.md }}>
          <Pressable onPress={() => router.push("/paths")}>
            <Panel>
              <Text variant="title" style={{ fontSize: 18 }}>
                {t("homeBlockPathsTitle")}
              </Text>
              <Text variant="muted" style={{ marginTop: spacing.xs }}>
                {t("homeBlockPathsBody")}
              </Text>
            </Panel>
          </Pressable>
        </Rise>

        <Rise delay={120} style={{ marginTop: spacing.md }}>
          <Pressable onPress={() => router.push(COMMUNITY_ROUTE_TARGETS.care)}>
            <Panel>
              <Text variant="title" style={{ fontSize: 18 }}>
                {t("homeBlockCareTitle")}
              </Text>
              <Text variant="muted" style={{ marginTop: spacing.xs }}>
                {t("homeBlockCareBody")}
              </Text>
            </Panel>
          </Pressable>
        </Rise>

        <Rise delay={160} style={{ marginTop: spacing.md }}>
          <Pressable onPress={() => router.push(COMMUNITY_ROUTE_TARGETS.support)}>
            <Panel>
              <Text variant="title" style={{ fontSize: 18 }}>
                {t("homeBlockSupportTitle")}
              </Text>
              <Text variant="muted" style={{ marginTop: spacing.xs }}>
                {t("homeBlockSupportBody")}
              </Text>
              <Text
                variant="muted"
                color={colors.brassSoft}
                style={{ marginTop: spacing.sm }}
              >
                {t("supportOpenDana")} →
              </Text>
            </Panel>
          </Pressable>
        </Rise>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  linkRow: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
