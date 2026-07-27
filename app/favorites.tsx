import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { SlokaCard, EmptyState } from "@/components/SlokaCard";
import { userApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";
import type { Sloka } from "@/types";

export default function FavoritesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const { isSignedIn, loading: authLoading } = useAuth();
  const [slokas, setSlokas] = useState<Sloka[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;
      if (!isSignedIn) {
        setLoading(false);
        setSlokas([]);
        return;
      }
      let alive = true;
      setLoading(true);
      userApi
        .favorites()
        .then((res) => {
          if (alive) {
            setSlokas(res.slokas ?? []);
            setError(null);
          }
        })
        .catch((e) => {
          if (alive) setError((e as Error).message);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
      return () => {
        alive = false;
      };
    }, [isSignedIn, authLoading])
  );

  if (!authLoading && !isSignedIn) {
    return (
      <Screen>
        <Text variant="display" style={{ marginTop: spacing.md }}>
          {t("favorites")}
        </Text>
        <EmptyState title={t("signIn")} body={t("signInToBookmark")} />
        <View style={{ marginTop: spacing.lg }}>
          <Button label={t("signIn")} onPress={() => router.push("/account")} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="display" style={{ marginTop: spacing.sm }}>
        {t("favorites")}
      </Text>
      <Text variant="soft" style={{ marginTop: spacing.xs }}>
        {t("favoritesBlurb")}
      </Text>
      {loading ? (
        <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <EmptyState title={lang === "hi" ? "त्रुटि" : "Couldn’t load"} body={error} />
      ) : (
        <FlatList
          data={slokas}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 120 }}
          renderItem={({ item }) => <SlokaCard sloka={item} lang={lang} />}
          ListEmptyComponent={
            <EmptyState title={t("noFavorites")} body={t("favoritesBlurb")} />
          }
        />
      )}
    </Screen>
  );
}
