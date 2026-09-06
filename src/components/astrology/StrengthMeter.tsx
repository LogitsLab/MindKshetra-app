import React from "react";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import type { DictKey } from "@/i18n/dictionary";
import {
  strengthDots,
  type StrengthLevel,
  type StrengthReason,
} from "@/components/astrology/houseStrength";

/** Reason code → i18n key. Shared by the Houses panel and the planet sheet. */
export const REASON_I18N_KEY: Record<StrengthReason["code"], DictKey> = {
  exalted: "astroReasonExalted",
  debilitated: "astroReasonDebilitated",
  own: "astroReasonOwn",
  kendra: "astroReasonKendra",
  trikona: "astroReasonTrikona",
  dusthana: "astroReasonDusthana",
  combust: "astroReasonCombust",
  retrograde: "astroReasonRetrograde",
  beneficAspect: "astroReasonBeneficAspect",
  maleficAspect: "astroReasonMaleficAspect",
  lordStrong: "astroReasonLordStrong",
  lordDusthana: "astroReasonLordDusthana",
  empty: "astroReasonEmpty",
};

export const LEVEL_I18N_KEY: Record<StrengthLevel, DictKey> = {
  weak: "astroStrengthWeak",
  moderate: "astroStrengthModerate",
  strong: "astroStrengthStrong",
  complex: "astroStrengthComplex",
};

function levelColor(level: StrengthLevel, colors: ReturnType<typeof useTheme>["colors"]): string {
  if (level === "strong") return colors.brass;
  if (level === "complex") return colors.brassSoft;
  if (level === "weak") return colors.textMuted;
  return colors.textSoft;
}

/** Join reasons into one plain-language "why" line. */
export function strengthWhy(
  reasons: StrengthReason[],
  t: (k: DictKey) => string,
  labelPlanet: (id: string) => string
): string {
  return reasons
    .map((r) => {
      const base = t(REASON_I18N_KEY[r.code]);
      return r.planet ? `${labelPlanet(r.planet)}: ${base}` : base;
    })
    .join(" · ");
}

export function StrengthBadge({ level }: { level: StrengthLevel }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { filled, total } = strengthDots(level);
  const color = levelColor(level, colors);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 3 }}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: i < filled ? color : colors.line,
            }}
          />
        ))}
      </View>
      <Text variant="eyebrow" style={{ color }}>
        {t(LEVEL_I18N_KEY[level])}
      </Text>
    </View>
  );
}
