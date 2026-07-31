import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import {
  LIFE_AREAS,
  type LifeArea,
  type PredictionsText,
} from "@/types/astrology";

type Props = {
  predictions: PredictionsText;
  /** Highest-confidence area from the chart verdicts (featuredAreaFromChart). */
  featuredArea?: LifeArea | null;
  detailed?: boolean;
  labels: {
    portrait: string;
    rulesBanner: string;
    regenerateHint: string;
    strengths: string;
    watchouts: string;
    now: string;
    nearTerm: string;
    guidance: string;
    featured: string;
    area: (id: LifeArea) => string;
  };
};

export function PredictionsPanel({
  predictions,
  featuredArea,
  detailed = true,
  labels,
}: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState<LifeArea | "portrait" | null>("portrait");

  const featured = useMemo(() => {
    if (featuredArea && predictions.areas[featuredArea]) return featuredArea;
    const entries = LIFE_AREAS.map((a) => ({
      area: a,
      row: predictions.areas[a],
    })).filter((x) => x.row);
    return entries[0]?.area ?? "career";
  }, [featuredArea, predictions.areas]);

  const areas = LIFE_AREAS.filter((a) => predictions.areas[a]);

  return (
    <View style={{ gap: spacing.md }}>
      {predictions.source === "rules" ? (
        <Text variant="muted" style={{ color: colors.brassSoft }}>
          {labels.rulesBanner}
        </Text>
      ) : null}

      <Pressable onPress={() => setOpen(open === "portrait" ? null : "portrait")}>
        <Text variant="eyebrow">{labels.portrait}</Text>
        <Text variant="soft" style={{ marginTop: spacing.xs }}>
          {predictions.portrait}
        </Text>
      </Pressable>

      {areas.map((area) => {
        const row = predictions.areas[area]!;
        const isOpen = open === area || (open === "portrait" && area === featured);
        const expanded = open === area;
        return (
          <View
            key={area}
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.hairline,
              paddingTop: spacing.md,
            }}
          >
            <Pressable
              onPress={() => setOpen(expanded ? null : area)}
              style={{ gap: 4 }}
            >
              <Text variant="eyebrow" style={{ color: colors.brassSoft }}>
                {area === featured ? labels.featured : labels.area(area)}
              </Text>
              <Text variant="title" style={{ fontSize: 18 }}>
                {row.headline}
              </Text>
              {!expanded ? (
                <Text variant="muted" numberOfLines={2}>
                  {row.overview}
                </Text>
              ) : null}
            </Pressable>

            {expanded ? (
              <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                <Text variant="soft">{row.overview}</Text>
                {detailed && row.strengths?.length ? (
                  <View>
                    <Text variant="eyebrow">{labels.strengths}</Text>
                    {row.strengths.map((s) => (
                      <Text key={s} variant="muted" style={{ marginTop: 2 }}>
                        • {s}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {detailed && row.watchouts?.length ? (
                  <View>
                    <Text variant="eyebrow">{labels.watchouts}</Text>
                    {row.watchouts.map((s) => (
                      <Text key={s} variant="muted" style={{ marginTop: 2 }}>
                        • {s}
                      </Text>
                    ))}
                  </View>
                ) : null}
                <View>
                  <Text variant="eyebrow" style={{ color: colors.brassSoft }}>
                    {labels.now}
                  </Text>
                  <Text variant="soft">{row.now}</Text>
                </View>
                {detailed ? (
                  <View>
                    <Text variant="eyebrow">{labels.nearTerm}</Text>
                    <Text variant="soft">{row.nearTerm}</Text>
                  </View>
                ) : null}
                <View
                  style={{
                    marginTop: spacing.xs,
                    padding: spacing.sm,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: colors.line,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Text variant="eyebrow">{labels.guidance}</Text>
                  <Text variant="soft" style={{ marginTop: 4 }}>
                    {row.guidance}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}

      <Text variant="muted">{labels.regenerateHint}</Text>
    </View>
  );
}
