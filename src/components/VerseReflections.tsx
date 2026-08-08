import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { userApi } from "@/api/endpoints";
import { ApiError } from "@/api/client";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { reflectionsOpen, reportsOpen } from "@/lib/kill-switch-public";
import { spacing } from "@/theme/tokens";

type Reflection = {
  id: string;
  reflection: string;
  sharedAt: string | null;
  author: { handle: string; displayName: string | null } | null;
};

/**
 * Shared sangha lines on a verse. Fail soft when the community surface is
 * dark (kill switch) or the fetch fails — never leave an empty forum shell.
 */
export function VerseReflections({ slokaId }: { slokaId: number }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [reflections, setReflections] = useState<Reflection[] | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!reflectionsOpen()) {
      setReflections(null);
      return;
    }
    let cancelled = false;
    userApi
      .verseReflections(slokaId)
      .then((data) => {
        if (!cancelled) setReflections(data.reflections ?? []);
      })
      .catch(() => {
        // Dark / network / paused — render nothing.
        if (!cancelled) setReflections(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slokaId]);

  if (!reflectionsOpen() || reflections == null) return null;

  const report = (id: string) => {
    if (!reportsOpen()) return;
    setReported((prev) => new Set(prev).add(id));
    void userApi.report("reflection", id).catch((e) => {
      if (e instanceof ApiError && e.status === 503) {
        // Reporting paused — keep the optimistic thank-you quiet.
      }
    });
  };

  return (
    <View
      testID="verse-reflections"
      style={[styles.section, { borderTopColor: colors.hairline }]}
    >
      <Text variant="eyebrow" color={colors.textMuted}>
        {t("reflectionsTitle")}
      </Text>
      {reflections.length === 0 ? (
        <Text variant="soft" color={colors.textMuted} style={styles.first}>
          {t("reflectionsFirst")}
        </Text>
      ) : (
        <View style={styles.list}>
          {reflections.map((item) => (
            <View
              key={item.id}
              style={[styles.item, { borderLeftColor: colors.hairline }]}
            >
              <Text variant="soft" style={styles.body}>
                {item.reflection}
              </Text>
              <View style={styles.meta}>
                {item.author ? (
                  <Pressable
                    onPress={() => router.push(`/u/${item.author!.handle}`)}
                    hitSlop={6}
                  >
                    <Text variant="muted" color={colors.brassSoft}>
                      {item.author.displayName || `@${item.author.handle}`}
                    </Text>
                  </Pressable>
                ) : (
                  <Text variant="muted" color={colors.textMuted}>
                    {t("reflectionsSeeker")}
                  </Text>
                )}
                {reportsOpen() ? (
                  <Pressable
                    onPress={() => report(item.id)}
                    disabled={reported.has(item.id)}
                    hitSlop={6}
                  >
                    <Text variant="muted" color={colors.textMuted}>
                      {reported.has(item.id)
                        ? t("reflectReported")
                        : t("reflectReport")}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  first: {
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  item: {
    borderLeftWidth: 2,
    paddingLeft: spacing.md,
  },
  body: {
    lineHeight: 24,
  },
  meta: {
    marginTop: spacing.xs,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    alignItems: "center",
  },
});
