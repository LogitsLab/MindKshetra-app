import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { Rise } from "@/components/Rise";
import { panchangApi } from "@/api/endpoints";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function PanchangCalendarScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const [month, setMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<
    Array<{
      date: string;
      tithi: string;
      nakshatra: string;
      vaar: string;
      isEkadashi?: boolean;
      isPurnima?: boolean;
      isAmavasya?: boolean;
    }>
  >([]);
  const [observances, setObservances] = useState<
    Array<{ date: string; name: string }>
  >([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const data = await panchangApi.calendar(month);
        if (!alive) return;
        setDays(data.days ?? []);
        setObservances(
          (data.observances ?? []).map((o) => ({
            date: o.date,
            name: o.name,
          }))
        );
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [month]);

  const weeks = useMemo(() => {
    const byWeek: typeof days[] = [];
    let bucket: typeof days = [];
    for (const day of days) {
      bucket.push(day);
      if (bucket.length === 7) {
        byWeek.push(bucket);
        bucket = [];
      }
    }
    if (bucket.length) byWeek.push(bucket);
    return byWeek;
  }, [days]);

  return (
    <Screen atmosphere="soft" padded>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.push("/panchang")}>
          <Text color={colors.brassSoft}>← {t("panchangTitle")}</Text>
        </Pressable>
        <Text variant="title" style={{ marginTop: spacing.md, fontSize: 26 }}>
          {t("panchangCalendarTitle")}
        </Text>
        <Text variant="muted" style={{ marginTop: spacing.xs }}>
          {t("panchangCalendarBody")}
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: spacing.lg,
            alignItems: "center",
          }}
        >
          <Pressable onPress={() => setMonth((m) => shiftMonth(m, -1))}>
            <Text color={colors.brassSoft}>←</Text>
          </Pressable>
          <Text variant="title" style={{ fontSize: 18 }}>
            {month}
          </Text>
          <Pressable onPress={() => setMonth((m) => shiftMonth(m, 1))}>
            <Text color={colors.brassSoft}>→</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator
            color={colors.brass}
            style={{ marginTop: spacing.xl }}
          />
        ) : error ? (
          <Text variant="muted" style={{ marginTop: spacing.lg }}>
            {error}
          </Text>
        ) : (
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            {weeks.map((week, wi) => (
              <Rise key={wi}>
                <Panel>
                  {week.map((day, di) => {
                    const mark = day.isEkadashi
                      ? "Ekadashi"
                      : day.isPurnima
                        ? "Pūrṇimā"
                        : day.isAmavasya
                          ? "Amāvasyā"
                          : null;
                    return (
                      <View
                        key={day.date}
                        style={{
                          paddingVertical: spacing.sm,
                          borderBottomWidth:
                            di < week.length - 1 ? 1 : 0,
                          borderBottomColor: colors.line,
                        }}
                      >
                        <Text variant="eyebrow" color={colors.brassSoft}>
                          {day.date.slice(8)} · {day.vaar}
                          {mark ? ` · ${mark}` : ""}
                        </Text>
                        <Text style={{ marginTop: 2 }}>
                          {day.tithi}
                          {lang === "hi" ? " · " : " · "}
                          {day.nakshatra}
                        </Text>
                      </View>
                    );
                  })}
                </Panel>
              </Rise>
            ))}
            {observances.length ? (
              <Rise style={{ marginTop: spacing.md }}>
                <Text variant="title" style={{ fontSize: 18 }}>
                  {t("panchangObservances")}
                </Text>
                {observances.map((o) => (
                  <Text
                    key={`${o.date}-${o.name}`}
                    variant="muted"
                    style={{ marginTop: spacing.xs }}
                  >
                    {o.date}: {o.name}
                  </Text>
                ))}
              </Rise>
            ) : null}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
