import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Text } from "@/components/Text";
import { Rise } from "@/components/Rise";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing, typeScale } from "@/theme/tokens";
import type { AppLang } from "@/i18n/dictionary";

type Props = {
  draftLang: AppLang;
  onSelect: (lang: AppLang) => void;
};

type Option = {
  code: AppLang;
  labelKey: "onboardingLangEn" | "onboardingLangHi";
  previewKey: "onboardingLangPreviewEn" | "onboardingLangPreviewHi";
};

const OPTIONS: Option[] = [
  {
    code: "en",
    labelKey: "onboardingLangEn",
    previewKey: "onboardingLangPreviewEn",
  },
  {
    code: "hi",
    labelKey: "onboardingLangHi",
    previewKey: "onboardingLangPreviewHi",
  },
];

function SelectionRing({ selected }: { selected: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.ring,
        {
          borderColor: selected ? colors.brass : colors.line,
          backgroundColor: selected ? colors.brass : "transparent",
        },
      ]}
    >
      {selected ? (
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke={colors.onBrass}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}

export function OnboardingLanguageStep({ draftLang, onSelect }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

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

      <View style={styles.row} accessibilityRole="radiogroup">
        {OPTIONS.map((opt) => {
          const selected = draftLang === opt.code;
          const devanagari = opt.code === "hi";
          return (
            <Pressable
              key={opt.code}
              onPress={() => onSelect(opt.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              accessibilityLabel={t(opt.labelKey)}
              accessibilityHint={selected ? t("onboardingLangSelected") : undefined}
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
              {/*
                Selection is not carried by colour alone: the ring reads as
                chosen/not chosen with the hue removed, which the brass border
                and brass label do not.
              */}
              <SelectionRing selected={selected} />

              {/*
                Each language is set in its own script at its own natural face.
                Fraunces has no Devanagari coverage, so declaring it on हिंदी
                only produced a silent fallback that looked like a different
                weight sitting next to the Latin card. The display variant is
                avoided here too: it carries -0.3 tracking, and DESIGN.md
                forbids letter-spacing on Devanagari because it pulls matras off
                their base consonants.
              */}
              <Text
                style={[
                  styles.name,
                  devanagari ? styles.nameDevanagari : styles.nameLatin,
                  { color: selected ? colors.brassSoft : colors.text },
                ]}
              >
                {t(opt.labelKey)}
              </Text>

              <Text variant="soft" style={styles.preview} numberOfLines={3}>
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
    minHeight: 168,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.md,
    justifyContent: "flex-start",
    gap: spacing.sm,
  },
  ring: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    marginTop: spacing.xs,
  },
  nameLatin: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: typeScale.display.size,
    lineHeight: typeScale.display.line,
    letterSpacing: -0.3,
  },
  nameDevanagari: {
    // Platform Devanagari face. No family declared, no tracking.
    fontWeight: "600",
    fontSize: typeScale.display.size,
    lineHeight: typeScale.display.line + 6,
  },
  preview: {
    marginTop: "auto",
  },
});
