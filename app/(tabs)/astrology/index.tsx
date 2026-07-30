import React, { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { BrandMark } from "@/components/BrandMark";
import { ScreenHeader } from "@/components/ScreenHeader";
import { astrologyApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { images } from "@/theme/assets";
import { spacing } from "@/theme/tokens";
import type { AstrologyMember } from "@/types";

export default function AstrologyHub() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const { isSignedIn } = useAuth();
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

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.contentBottom, paddingTop: spacing.sm }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title={lang === "hi" ? "ज्योतिष" : "Astrology"}
          subtitle={
            lang === "hi"
              ? "जन्म कुंडली, दशा और विस्तृत ज्योतिष पठन।"
              : "Birth charts, dashas, and detailed Jyotish readings."
          }
        />

        <View style={styles.hero}>
          <Image
            source={images.pathExplore}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(7,9,15,0.55)", "rgba(7,9,15,0.92)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroMark}>
            <BrandMark size={40} />
          </View>
          <Text variant="eyebrow" color={colors.brassSoft}>
            Chart
          </Text>
          <Text variant="title" color={colors.onMedia} style={{ marginTop: spacing.sm }}>
            {lang === "hi" ? "कुंडली केंद्र" : "Chart center"}
          </Text>
          <Text variant="soft" color={colors.onMediaMuted} style={{ marginTop: spacing.xs }}>
            {lang === "hi"
              ? "सदस्य सहेजें या गुप्त सत्र शुरू करें।"
              : "Save members or start an incognito session."}
          </Text>
        </View>

        {hubError ? (
          <Panel style={{ marginTop: spacing.md }}>
            <Text variant="soft" color={colors.danger}>
              {hubError}
            </Text>
          </Panel>
        ) : null}

        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          <Button
            label={lang === "hi" ? "गुप्त कुंडली" : "Incognito chart"}
            onPress={() => router.push("/astrology/incognito")}
          />
          <Button
            label={lang === "hi" ? "सदस्य" : "Saved members"}
            variant="ghost"
            onPress={() => router.push("/astrology/members")}
          />
          {!isSignedIn ? (
            <Pressable onPress={() => router.push("/account")}>
              <Text
                variant="muted"
                style={{ textAlign: "center", marginTop: spacing.sm }}
              >
                {lang === "hi"
                  ? "सदस्य सहेजने के लिए साइन इन करें"
                  : "Sign in to save members"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {members.length > 0 ? (
          <Panel style={{ marginTop: spacing.xl }}>
            <Text variant="eyebrow">Recent</Text>
            {members.slice(0, 5).map((m, i) => (
              <Pressable
                key={m.id}
                onPress={() => router.push(`/astrology/members/${m.id}`)}
                style={[
                  styles.member,
                  {
                    borderBottomColor: colors.hairline,
                    borderBottomWidth: i === members.slice(0, 5).length - 1 ? 0 : StyleSheet.hairlineWidth * 2,
                  },
                ]}
              >
                <Text variant="title" style={{ fontSize: 18 }}>
                  {m.name}
                </Text>
                <Text variant="muted">{m.placeLabel ?? m.dob}</Text>
              </Pressable>
            ))}
          </Panel>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: spacing.lg,
    minHeight: 180,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: spacing.lg,
  },
  heroMark: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    opacity: 0.9,
  },
  member: {
    paddingVertical: spacing.md,
  },
});
