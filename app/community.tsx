import React, { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { PageHero } from "@/components/PageHero";
import { Rise } from "@/components/Rise";
import { eventsApi } from "@/api/endpoints";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { COMMUNITY_ROUTE_TARGETS } from "@/data/community";
import { images } from "@/theme/assets";
import { spacing } from "@/theme/tokens";

const WHATSAPP = process.env.EXPO_PUBLIC_WHATSAPP_CHANNEL_URL;
const TELEGRAM = process.env.EXPO_PUBLIC_TELEGRAM_URL;

export default function CommunityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [attended, setAttended] = useState(false);

  function markAttended() {
    // The Sangha → Community rename is UI-only. The event name (and its
    // mobile_sangha source) must stay: the G2 gate queries and all recorded
    // attendance history key on "sangha_attended".
    void eventsApi.send("sangha_attended", { source: "mobile_sangha" });
    setAttended(true);
  }

  return (
    <Screen atmosphere="soft" padded>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <PageHero
            image={images.pathCommunity}
            eyebrow={t("homeBlockSanghaTitle")}
            title={t("homeTogetherTitle")}
            body={t("homeTogetherBlurb")}
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
              {WHATSAPP ? (
                <Pressable onPress={() => void Linking.openURL(WHATSAPP)}>
                  <Text color={colors.brassSoft}>WhatsApp →</Text>
                </Pressable>
              ) : null}
              {TELEGRAM ? (
                <Pressable onPress={() => void Linking.openURL(TELEGRAM)}>
                  <Text color={colors.brassSoft}>Telegram →</Text>
                </Pressable>
              ) : null}
              {!WHATSAPP && !TELEGRAM ? (
                <Text variant="muted">{t("sanghaChannelsSoon")}</Text>
              ) : null}
            </View>
            <View style={{ marginTop: spacing.md }}>
              <Button
                label={attended ? t("sanghaAttendedDone") : t("sanghaAttended")}
                variant={attended ? "ghost" : "primary"}
                onPress={markAttended}
                disabled={attended}
              />
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
