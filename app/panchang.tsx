import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { Rise } from "@/components/Rise";
import { EmptyState } from "@/components/SlokaCard";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { usePanchang } from "@/hooks/usePanchang";
import { spacing } from "@/theme/tokens";

/**
 * "2026-07-31T18:42:10+05:30" → "18:42" — same rule as the web's PanchangView.
 *
 * The panchang is computed for New Delhi and the API's ISO strings already
 * carry IST wall time before the offset, so the clock is read straight off the
 * string. `new Date(iso).toLocaleTimeString()` would convert to the device
 * zone and show a London user sunrise at 01:27.
 */
function formatTime(iso: string | null): string | null {
  const m = iso?.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : null;
}

function formatDay(day: string, locale: string): string {
  const d = new Date(`${day}T12:00:00`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Row({
  label,
  value,
  sub,
  last,
}: {
  label: string;
  value: string;
  sub?: string | null;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: colors.hairline,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth * 2,
        },
      ]}
    >
      <Text variant="muted" style={styles.rowLabel}>
        {label}
      </Text>
      <View style={styles.rowValue}>
        <Text variant="body" style={{ textAlign: "right" }}>
          {value}
        </Text>
        {sub ? (
          <Text variant="muted" style={{ textAlign: "right", marginTop: 2 }}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function PanchangScreen() {
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const { panchang, loading, error } = usePanchang();
  const locale = lang === "hi" ? "hi-IN" : "en-IN";

  // Fraunces has no Devanagari coverage (docs/design/VISUAL_SYSTEM.md) and a
  // letter-spaced eyebrow breaks matra shaping — the hi-IN date header gets
  // the real serif and zero tracking.
  const hiDisplay =
    lang === "hi"
      ? { fontFamily: "NotoSerifDevanagari_600SemiBold" as const }
      : null;
  const hiEyebrow =
    lang === "hi"
      ? { letterSpacing: 0, textTransform: "none" as const }
      : null;

  if (loading) {
    return (
      <Screen atmosphere="soft">
        <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  if (error || !panchang) {
    return (
      <Screen>
        <EmptyState
          title={t("panchangUnavailable")}
          body={t("panchangUnavailableBody")}
        />
      </Screen>
    );
  }

  const until = (time: string | null) =>
    time ? t("panchangUntil").replace("{time}", time) : null;
  const tithiUntil = until(formatTime(panchang.tithiEndsAt));
  const nakUntil = until(formatTime(panchang.nakshatraEndsAt));
  const sunrise = formatTime(panchang.sunrise);
  const sunset = formatTime(panchang.sunset);

  const nakSub = [`${t("panchangPada")} ${panchang.pada}`, nakUntil]
    .filter(Boolean)
    .join(" · ");

  return (
    <Screen atmosphere="soft">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingTop: spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <Text variant="eyebrow" color={colors.brassSoft} style={hiEyebrow}>
            {t("panchangTitle")}
          </Text>
          <Text variant="display" style={[{ marginTop: spacing.sm }, hiDisplay]}>
            {formatDay(panchang.date, locale)}
          </Text>
          <Text variant="soft" color={colors.brassSoft} style={{ marginTop: spacing.xs }}>
            {panchang.vaar}
          </Text>
          <Text variant="muted" style={{ marginTop: spacing.xs }}>
            {t("panchangLocationLine")}
          </Text>
        </Rise>

        {panchang.isEkadashi ? (
          <Panel style={{ marginTop: spacing.lg }}>
            <Text variant="soft" color={colors.brassSoft}>
              {t("panchangEkadashi").replace("{tithi}", panchang.tithi)}
            </Text>
          </Panel>
        ) : null}

        <Panel style={{ marginTop: spacing.lg }} padded={false}>
          <View style={{ paddingHorizontal: spacing.md }}>
            <Row label={t("astroTithi")} value={panchang.tithi} sub={tithiUntil} />
            <Row
              label={t("astroNakshatra")}
              value={panchang.nakshatra}
              sub={nakSub || null}
            />
            <Row label={t("astroYoga")} value={panchang.yoga} />
            <Row label={t("astroKarana")} value={panchang.karana} />
            <Row
              label={t("panchangSun")}
              value={`${sunrise ?? "—"} · ${sunset ?? "—"}`}
              last
            />
          </View>
        </Panel>

        <Text variant="muted" style={{ marginTop: spacing.lg }}>
          {t("panchangFootnote")}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowLabel: {
    paddingTop: 2,
  },
  rowValue: {
    flex: 1,
    alignItems: "flex-end",
  },
});
