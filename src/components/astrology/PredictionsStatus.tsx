import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import type {
  PredictionsErrorKind,
  PredictionsStage,
} from "@/hooks/usePredictions";

type Props = {
  busy: boolean;
  stage: PredictionsStage;
  error: string | null;
  errorKind: PredictionsErrorKind;
  retryAfterSec: number | null;
  onRetry: () => void;
};

/**
 * The predictions tab while there is no reading yet: skeleton blocks with
 * staged honest copy while the model writes, and a retry panel per failure
 * kind (429 countdown, 5xx retry, network) when it fails.
 */
export function PredictionsStatus({
  busy,
  stage,
  error,
  errorKind,
  retryAfterSec,
  onRetry,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  if (busy) {
    const stageLabel =
      stage === "relink"
        ? t("astroPredStageRelink")
        : stage === "composing"
          ? t("astroPredStageComposing")
          : t("astroPredStageReading");
    return (
      <View style={{ gap: spacing.md }}>
        <Text variant="muted" style={{ color: colors.brassSoft }}>
          {stageLabel}
        </Text>
        <SkeletonLines />
      </View>
    );
  }

  if (errorKind) {
    const counting =
      errorKind === "rate-limited" && retryAfterSec != null && retryAfterSec > 0;
    const message =
      errorKind === "rate-limited"
        ? t("astroPredErrBusy")
        : errorKind === "network"
          ? t("astroPredErrNetwork")
          : t("astroPredErrFailed");
    return (
      <View style={{ gap: spacing.sm }}>
        <Text variant="soft">{message}</Text>
        {counting ? (
          <Text variant="muted">
            {t("astroPredRetryIn").replace("{sec}", String(retryAfterSec))}
          </Text>
        ) : null}
        {error && error !== message ? (
          <Text variant="muted">{error}</Text>
        ) : null}
        <Button
          label={t("astroPredRetry")}
          variant="ghost"
          disabled={counting}
          onPress={onRetry}
        />
      </View>
    );
  }

  return <Text variant="soft">{t("astroPredBlurb")}</Text>;
}

const LINE_WIDTHS = ["38%", "100%", "94%", "82%", "52%", "97%", "88%"] as const;
const HEADING_INDEXES = new Set([0, 4]);

function SkeletonLines() {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduceMotion(Boolean(v));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.55);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, opacity]);

  return (
    <View style={{ gap: spacing.sm }}>
      {LINE_WIDTHS.map((width, i) => (
        <Animated.View
          key={`${width}-${i}`}
          style={[
            styles.line,
            HEADING_INDEXES.has(i) ? styles.heading : null,
            i === 4 ? styles.sectionGap : null,
            { width, opacity, backgroundColor: colors.surfaceHover },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    height: 12,
    borderRadius: radii.sm,
  },
  heading: {
    height: 18,
  },
  sectionGap: {
    marginTop: spacing.md,
  },
});
