import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { Rise } from "@/components/Rise";
import { EmptyState } from "@/components/SlokaCard";
import { astrologyApi } from "@/api/endpoints";
import { ApiError } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useMadhav } from "@/context/MadhavContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import type { AstrologyMember, CompatibilityResult } from "@/types";

/**
 * The band leads as prose and the number stays secondary on purpose: a low
 * score shown bluntly can do real harm inside real relationships. Nothing here
 * colors by value, meters, or gauges.
 */
const BAND_KEY = {
  excellent: "milanBandExcellent",
  good: "milanBandGood",
  acceptable: "milanBandAcceptable",
  "needs-discussion": "milanBandNeedsDiscussion",
} as const;

function Chip({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? colors.brass : colors.line,
          backgroundColor: selected
            ? "rgba(201, 162, 39, 0.14)"
            : pressed
              ? colors.surfaceHover
              : colors.surface,
          opacity: disabled ? 0.35 : 1,
        },
      ]}
    >
      <Text
        variant="body"
        style={{
          fontSize: 14,
          fontFamily: selected ? "Sora_600SemiBold" : "Sora_400Regular",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function MilanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { isSignedIn, loading: authLoading } = useAuth();
  const { ask } = useMadhav();

  const [members, setMembers] = useState<AstrologyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [memberA, setMemberA] = useState<string | null>(null);
  const [memberB, setMemberB] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [gentleError, setGentleError] = useState<{
    title: string;
    body: string;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;
      if (!isSignedIn) {
        setLoadingMembers(false);
        setMembers([]);
        return;
      }
      let alive = true;
      setLoadingMembers(true);
      astrologyApi
        .members()
        .then((res) => {
          if (alive) setMembers(res.members ?? []);
        })
        .catch(() => {
          if (alive) setMembers([]);
        })
        .finally(() => {
          if (alive) setLoadingMembers(false);
        });
      return () => {
        alive = false;
      };
    }, [isSignedIn, authLoading])
  );

  const pickA = (id: string) => {
    setMemberA(id);
    if (memberB === id) setMemberB(null);
    setResult(null);
    setGentleError(null);
  };

  const pickB = (id: string) => {
    setMemberB(id);
    setResult(null);
    setGentleError(null);
  };

  const run = async () => {
    if (!memberA || !memberB || memberA === memberB) return;
    setComputing(true);
    setResult(null);
    setGentleError(null);
    try {
      const res = await astrologyApi.compatibility(memberA, memberB);
      setResult(res.result);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 422) {
        // The server explains which chart lacks a birth time — show its words,
        // never a zero that would read as "incompatible".
        setGentleError({ title: t("milanMissingTime"), body: err.message });
      } else if (err.status === 401) {
        setGentleError({ title: t("signIn"), body: t("astroSignInPrompt") });
      } else {
        setGentleError({ title: t("milanFailed"), body: err.message });
      }
    } finally {
      setComputing(false);
    }
  };

  const talkItThrough = () => {
    if (!result) return;
    const nameA = members.find((m) => m.id === memberA)?.name ?? "one person";
    const nameB = members.find((m) => m.id === memberB)?.name ?? "another";
    ask(
      `We compared the charts of ${nameA} and ${nameB} with the traditional guna milan count; it came to ${result.total} of 36. Help us talk through what this count does and does not mean for a relationship.`
    );
    router.push("/madhav");
  };

  if (!authLoading && !isSignedIn) {
    return (
      <Screen>
        <Text variant="display" style={{ marginTop: spacing.md }}>
          {t("milanTitle")}
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
      <ScrollView
        contentContainerStyle={{
          paddingBottom: spacing.contentBottom,
          paddingTop: spacing.sm,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <Text variant="display" style={{ marginTop: spacing.sm }}>
            {t("milanTitle")}
          </Text>
          <Text variant="soft" style={{ marginTop: spacing.xs }}>
            {t("milanIntro")}
          </Text>
        </Rise>

        {loadingMembers ? (
          <ActivityIndicator
            color={colors.brass}
            style={{ marginTop: spacing.xl }}
          />
        ) : members.length < 2 ? (
          <>
            <EmptyState title={t("milanNeedTwo")} body={t("milanNeedTwoBody")} />
            <View style={{ marginTop: spacing.lg }}>
              <Button
                label={t("astroAddMember")}
                onPress={() => router.push("/astrology/members/new")}
              />
            </View>
          </>
        ) : (
          <>
            <View style={{ marginTop: spacing.lg }}>
              <Text variant="eyebrow" color={colors.brassSoft}>
                {t("milanFirst")}
              </Text>
              <View style={styles.chips}>
                {members.map((m) => (
                  <Chip
                    key={m.id}
                    label={m.name}
                    selected={memberA === m.id}
                    onPress={() => pickA(m.id)}
                  />
                ))}
              </View>
              <Text
                variant="eyebrow"
                color={colors.brassSoft}
                style={{ marginTop: spacing.lg }}
              >
                {t("milanSecond")}
              </Text>
              <View style={styles.chips}>
                {members.map((m) => (
                  <Chip
                    key={m.id}
                    label={m.name}
                    selected={memberB === m.id}
                    disabled={memberA === m.id}
                    onPress={() => pickB(m.id)}
                  />
                ))}
              </View>
            </View>

            <View style={{ marginTop: spacing.lg }}>
              <Button
                label={t("milanCompute")}
                loading={computing}
                disabled={!memberA || !memberB || memberA === memberB}
                onPress={run}
              />
            </View>

            {gentleError ? (
              <EmptyState title={gentleError.title} body={gentleError.body} />
            ) : null}

            {result ? (
              <Rise style={{ marginTop: spacing.xl }}>
                <Text
                  variant="display"
                  style={{ fontSize: 24, lineHeight: 32 }}
                >
                  {t(BAND_KEY[result.band])}
                </Text>
                <Text variant="muted" style={{ marginTop: spacing.sm }}>
                  {t("milanOf36").replace("{total}", String(result.total))}
                </Text>

                <Panel style={{ marginTop: spacing.lg }} padded={false}>
                  <View style={{ paddingHorizontal: spacing.md }}>
                    {result.kootas.map((k, i) => (
                      <View
                        key={k.name}
                        style={[
                          styles.koota,
                          {
                            borderBottomColor: colors.hairline,
                            borderBottomWidth:
                              i === result.kootas.length - 1
                                ? 0
                                : StyleSheet.hairlineWidth * 2,
                          },
                        ]}
                      >
                        <View style={styles.kootaHead}>
                          <Text
                            variant="body"
                            style={{ fontFamily: "Sora_600SemiBold" }}
                          >
                            {k.name}
                          </Text>
                          <Text variant="muted">
                            {k.score}/{k.max}
                          </Text>
                        </View>
                        <Text
                          variant="soft"
                          style={{
                            marginTop: 2,
                            fontSize: 13,
                            lineHeight: 18,
                          }}
                        >
                          {k.note}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Panel>

                {/* The caveat is part of the reading, never fine print. */}
                <Text variant="soft" style={{ marginTop: spacing.lg }}>
                  {result.caveat}
                </Text>

                {result.nadiDosha ? (
                  <Panel style={{ marginTop: spacing.lg }}>
                    <Text variant="soft">{t("milanNadi")}</Text>
                  </Panel>
                ) : null}

                {result.band === "needs-discussion" ? (
                  <View style={{ marginTop: spacing.lg }}>
                    <Button
                      label={t("milanTalkMadhav")}
                      onPress={talkItThrough}
                    />
                  </View>
                ) : null}
              </Rise>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  koota: {
    paddingVertical: spacing.md,
  },
  kootaHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
});
