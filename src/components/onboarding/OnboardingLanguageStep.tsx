import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { Rise } from "@/components/Rise";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import type { AppLang } from "@/i18n/dictionary";

type Props = {
  draftLang: AppLang;
  onSelect: (lang: AppLang) => void;
};

export function OnboardingLanguageStep({ draftLang, onSelect }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const options: {
    code: AppLang;
    labelKey: "onboardingLangEn" | "onboardingLangHi";
    previewKey: "onboardingLangPreviewEn" | "onboardingLangPreviewHi";
    sample: string;
  }[] = [
    {
      code: "en",
      labelKey: "onboardingLangEn",
      previewKey: "onboardingLangPreviewEn",
      sample: "A",
    },
    {
      code: "hi",
      labelKey: "onboardingLangHi",
      previewKey: "onboardingLangPreviewHi",
      sample: "अ",
    },
  ];

  return (
    <Rise>
      <Text variant="eyebrow" color={colors.brassSoft}>
        {t("onboardingLangEyebrow")}
      </Text>
      <Text variant="display" style={styles.title}>
        {t("onboardingLangTitle")}
      </Text>
      <Text variant="soft" style={styles.body}>
        {t("onboardingLangBody")}
      </Text>
      <View style={styles.row}>
        {options.map((opt) => {
          const selected = draftLang === opt.code;
          return (
            <Pressable
              key={opt.code}
              onPress={() => onSelect(opt.code)}
              style={({ pressed }) => [
                styles.card,
                {
                  borderColor: selected ? colors.brass : colors.line,
                  backgroundColor: selected
                    ? "rgba(201,162,39,0.12)"
                    : pressed
                      ? colors.surfaceHover
                      : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.sample,
                  {
                    color: selected ? colors.brassSoft : colors.textMuted,
                    fontFamily:
                      opt.code === "hi"
                        ? "Fraunces_600SemiBold"
                        : "Fraunces_600SemiBold",
                  },
                ]}
              >
                {opt.sample}
              </Text>
              <Text
                variant="title"
                style={{
                  fontSize: 22,
                  color: selected ? colors.brassSoft : colors.text,
                }}
              >
                {t(opt.labelKey)}
              </Text>
              <Text variant="soft" style={{ marginTop: spacing.sm }} numberOfLines={2}>
                {t(opt.previewKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Rise>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.sm,
  },
  body: {
    marginTop: spacing.md,
    lineHeight: 24,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  card: {
    flex: 1,
    minHeight: 160,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.md,
    justifyContent: "center",
  },
  sample: {
    fontSize: 36,
    lineHeight: 44,
    marginBottom: spacing.xs,
  },
});
