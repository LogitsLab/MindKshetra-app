import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Panel } from "@/components/Panel";
import { Text } from "@/components/Text";
import { astrologyApi } from "@/api/endpoints";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";

type PracticeCard = {
  area: string;
  fact: string;
  timing: string | null;
  actionIndex: number;
  verse: { id: number; ref: string; english: string; hindi: string };
};

/**
 * Pressure → Practice: leading chart tension, one verse, one small action.
 * Fail-soft — any fetch problem and the card simply isn't there.
 */
export function PressurePracticeCard({ memberId }: { memberId: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const [card, setCard] = useState<PracticeCard | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCard(null);
    astrologyApi
      .practiceCard(memberId)
      .then((data) => {
        if (!cancelled && data?.verse) setCard(data as PracticeCard);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  if (!card) return null;

  const actionLabel =
    t(`ppAction_${card.area}_${card.actionIndex}` as never) || card.fact;
  const excerptSource = lang === "hi" ? card.verse.hindi : card.verse.english;
  const excerpt =
    excerptSource.length > 180
      ? `${excerptSource.slice(0, 180).trimEnd()}…`
      : excerptSource;

  return (
    <Panel style={{ marginTop: spacing.md }}>
      <Text variant="eyebrow" color={colors.brassSoft}>
        {t("ppEyebrow")}
      </Text>
      <Text variant="body" style={{ marginTop: spacing.sm }}>
        {card.fact}
      </Text>
      {card.timing ? (
        <Text variant="muted" style={{ marginTop: spacing.xs }}>
          {card.timing}
        </Text>
      ) : null}

      <View style={[styles.divider, { borderTopColor: colors.line }]}>
        <Text variant="soft">{excerpt}</Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(`/sloka/${card.verse.id}`)}
          style={({ pressed }) => [{ marginTop: spacing.sm, opacity: pressed ? 0.6 : 1 }]}
        >
          <Text
            variant="muted"
            color={colors.brassSoft}
            style={{ fontFamily: "Fraunces_500Medium" }}
          >
            {card.verse.ref} · {t("ppReadVerse")}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.divider, { borderTopColor: colors.line }]}>
        <Text variant="eyebrow" color={colors.textMuted}>
          {t("ppActionLabel")}
        </Text>
        <Text variant="soft" style={{ marginTop: spacing.sm }}>
          {actionLabel}
        </Text>
      </View>

      <Text variant="muted" style={{ marginTop: spacing.md, fontSize: 12 }}>
        {t("ppProvenance")}
      </Text>
    </Panel>
  );
}

const styles = StyleSheet.create({
  divider: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
