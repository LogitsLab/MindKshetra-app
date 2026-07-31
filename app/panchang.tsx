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

function formatTime(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // The ISO string carries its own offset; rendering converts to device time.
  return d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
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
  const tithiUntil = until(formatTime(panchang.tithiEndsAt, locale));
  const nakUntil = until(formatTime(panchang.nakshatraEndsAt, locale));
  const sunrise = formatTime(panchang.sunrise, locale);
  const sunset = formatTime(panchang.sunset, locale);

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
          <Text variant="eyebrow" color={colors.brassSoft}>
            {t("panchangTitle")}
          </Text>
          <Text variant="display" style={{ marginTop: spacing.sm }}>
            {formatDay(panchang.date, locale)}
          </Text>
          <Text variant="soft" color={colors.brassSoft} style={{ marginTop: spacing.xs }}>
            {panchang.vaar}
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
