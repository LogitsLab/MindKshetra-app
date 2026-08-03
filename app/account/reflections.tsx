import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/SlokaCard";
import { userApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useFocusRefresh } from "@/hooks/useFocusRefresh";
import { radii, spacing } from "@/theme/tokens";
import type { JournalEntry } from "@/types";

export default function ReflectionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const { isSignedIn, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusRefresh(
    "journal",
    async (isActive) => {
      if (!isSignedIn) {
        setLoading(false);
        setEntries([]);
        return;
      }
      setLoading(true);
      try {
        const res = await userApi.journal();
        if (isActive()) {
          setEntries(res.entries ?? []);
          setError(null);
        }
      } catch (e) {
        if (isActive()) setError((e as Error).message);
        throw e;
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    { enabled: !authLoading, resetKey: String(isSignedIn) }
  );

  if (!authLoading && !isSignedIn) {
    return (
      <Screen>
        <Text variant="display" style={{ marginTop: spacing.md }}>
          {t("myReflections")}
        </Text>
        <EmptyState title={t("signIn")} body={t("signInToJournal")} />
        <View style={{ marginTop: spacing.lg }}>
          <Button label={t("signIn")} onPress={() => router.push("/account")} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="display" style={{ marginTop: spacing.sm }}>
        {t("myReflections")}
      </Text>
      {loading ? (
        <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <EmptyState title={lang === "hi" ? "त्रुटि" : "Couldn’t load"} body={error} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/sloka/${item.sloka_id}`)}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.line },
              ]}
            >
              <Text variant="eyebrow">
                {lang === "hi" ? "श्लोक" : "Verse"} {item.sloka_id}
              </Text>
              <Text variant="soft" style={{ marginTop: spacing.sm }}>
                {item.reflection}
              </Text>
              <Text variant="muted" style={{ marginTop: spacing.sm }}>
                {new Date(item.created_at).toLocaleDateString(
                  lang === "hi" ? "hi-IN" : "en-US"
                )}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState title={t("noReflections")} body={t("journalPlaceholder")} />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});
