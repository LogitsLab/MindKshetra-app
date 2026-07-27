import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/SlokaCard";
import { astrologyApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";
import type { AstrologyMember } from "@/types";

export default function AstrologyMembersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const { isSignedIn, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<AstrologyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;
      if (!isSignedIn) {
        setLoading(false);
        setMembers([]);
        return;
      }
      let alive = true;
      setLoading(true);
      astrologyApi
        .members()
        .then((res) => {
          if (alive) {
            setMembers(res.members ?? []);
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
          {t("astroMembersTitle")}
        </Text>
        <EmptyState title={t("signIn")} body={t("astroSignInPrompt")} />
        <View style={{ marginTop: spacing.lg }}>
          <Button label={t("signIn")} onPress={() => router.push("/account")} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="display" style={{ marginTop: spacing.sm }}>
        {t("astroMembersTitle")}
      </Text>
      <Text variant="soft" style={{ marginTop: spacing.xs }}>
        {t("astroMembersBlurb")}
      </Text>
      <View style={{ marginTop: spacing.md }}>
        <Button
          label={t("astroAddMember")}
          onPress={() => router.push("/astrology/members/new")}
        />
      </View>
      {loading ? (
        <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <EmptyState title={lang === "hi" ? "त्रुटि" : "Couldn’t load"} body={error} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/astrology/members/${item.id}`)}
              style={[styles.row, { borderBottomColor: colors.hairline }]}
            >
              <Text variant="title" style={{ fontSize: 18 }}>
                {item.name}
              </Text>
              <Text variant="muted">
                {item.placeLabel ?? item.dob}
                {item.currentMahaLord ? ` · ${item.currentMahaLord}` : ""}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState title={t("astroEmptyMembers")} body={t("astroAddMemberBlurb")} />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
});
