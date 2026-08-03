import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { BirthDetailsForm } from "@/components/astrology/BirthDetailsForm";
import {
  birthPayloadFromDetails,
  emptyBirthDetails,
  hasValidDob,
  type BirthDetails,
} from "@/components/astrology/birthDetails";
import { astrologyApi } from "@/api/endpoints";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

const RELATIONS = ["self", "spouse", "child", "friend", "other"] as const;

export default function NewAstrologyMemberScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [relationship, setRelationship] =
    useState<(typeof RELATIONS)[number]>("self");
  const [details, setDetails] = useState<BirthDetails>(emptyBirthDetails);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) {
      setError(t("astroName"));
      return;
    }
    const birthPayload = birthPayloadFromDetails(details);
    if (!birthPayload) {
      setError(hasValidDob(details) ? t("astroPlaceRequired") : t("astroDobRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await astrologyApi.createMember({
        name: name.trim(),
        relationship,
        ...birthPayload,
      });
      router.replace(`/astrology/members/${res.member.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingTop: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="eyebrow">{t("astroEyebrow")}</Text>
        <Text variant="display" style={{ marginTop: spacing.sm }}>
          {t("astroAddMember")}
        </Text>
        <Text variant="soft" style={{ marginTop: spacing.sm }}>
          {t("astroAddMemberBlurb")}
        </Text>

        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <Text variant="eyebrow">{t("astroName")}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("astroNameOptionalPh")}
            placeholderTextColor={colors.textMuted}
            style={inputStyle(colors)}
          />

          <Text variant="eyebrow">{t("astroRelationship")}</Text>
          <View style={styles.relRow}>
            {RELATIONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => setRelationship(r)}
                style={[
                  styles.relChip,
                  {
                    borderColor: colors.line,
                    backgroundColor:
                      relationship === r ? colors.surfaceHover : colors.surface,
                  },
                ]}
              >
                <Text
                  variant="muted"
                  style={{
                    color: relationship === r ? colors.brassSoft : colors.textMuted,
                  }}
                >
                  {t(
                    `astroRel_${r}` as
                      | "astroRel_self"
                      | "astroRel_spouse"
                      | "astroRel_child"
                      | "astroRel_friend"
                      | "astroRel_other"
                  )}
                </Text>
              </Pressable>
            ))}
          </View>

          <BirthDetailsForm value={details} onChange={setDetails} />

          <Button
            label={t("astroSaveChart")}
            loading={busy}
            onPress={() => void create()}
          />
          {error ? (
            <Text variant="muted" style={{ color: colors.danger }}>
              {error}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function inputStyle(colors: ReturnType<typeof useTheme>["colors"]) {
  return {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    borderColor: colors.line,
    backgroundColor: colors.inputBg,
    fontFamily: "Sora_400Regular" as const,
  };
}

const styles = StyleSheet.create({
  relRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  relChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
