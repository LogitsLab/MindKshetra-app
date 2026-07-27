import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { astrologyApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import type { AstrologyMember } from "@/types";

export default function AstrologyHub() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const { isSignedIn } = useAuth();
  const [members, setMembers] = useState<AstrologyMember[]>([]);

  useEffect(() => {
    if (!isSignedIn) return;
    astrologyApi
      .members()
      .then((r) => setMembers(r.members ?? []))
      .catch(() => undefined);
  }, [isSignedIn]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: spacing.md }}>
        <Text variant="display">{lang === "hi" ? "ज्योतिष" : "Astrology"}</Text>
        <Text variant="soft" style={{ marginTop: spacing.sm }}>
          {lang === "hi"
            ? "कुंडली के साथ गीता पढ़ें।"
            : "Read the Gita beside a birth chart."}
        </Text>

        <View style={[styles.hero, { borderColor: colors.line, backgroundColor: colors.panel }]}>
          <Text variant="eyebrow">Chart</Text>
          <Text variant="title" style={{ marginTop: spacing.sm }}>
            {lang === "hi" ? "कुंडली केंद्र" : "Chart center"}
          </Text>
          <Text variant="soft" style={{ marginTop: spacing.xs }}>
            {lang === "hi"
              ? "सदस्य सहेजें या गुप्त सत्र शुरू करें।"
              : "Save members or start an incognito session."}
          </Text>
        </View>

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
              <Text variant="muted" style={{ textAlign: "center", marginTop: spacing.sm }}>
                {lang === "hi"
                  ? "सदस्य सहेजने के लिए साइन इन करें"
                  : "Sign in to save members"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {members.length > 0 ? (
          <View style={{ marginTop: spacing.xl }}>
            <Text variant="eyebrow">Recent</Text>
            {members.slice(0, 5).map((m) => (
              <Pressable
                key={m.id}
                onPress={() => router.push(`/astrology/members/${m.id}`)}
                style={[styles.member, { borderColor: colors.hairline }]}
              >
                <Text variant="title" style={{ fontSize: 18 }}>
                  {m.name}
                </Text>
                <Text variant="muted">{m.placeLabel ?? m.dob}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    minHeight: 140,
    justifyContent: "center",
  },
  member: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
});
