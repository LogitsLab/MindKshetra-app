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
import { astrologyApi } from "@/api/endpoints";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

type GeoResult = { label: string; lat: number; lng: number; ianaTz: string };

const RELATIONS = ["self", "spouse", "child", "friend", "other"] as const;

export default function NewAstrologyMemberScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [relationship, setRelationship] =
    useState<(typeof RELATIONS)[number]>("self");
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("12:00");
  const [placeQuery, setPlaceQuery] = useState("");
  const [place, setPlace] = useState<GeoResult | null>(null);
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function searchPlace() {
    const q = placeQuery.trim();
    if (q.length < 2) return;
    setGeoBusy(true);
    setError(null);
    try {
      const res = await astrologyApi.geocode(q);
      setSuggestions(res.results ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGeoBusy(false);
    }
  }

  async function create() {
    if (!name.trim()) {
      setError(t("astroName"));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      setError(t("astroDobRequired"));
      return;
    }
    if (!place) {
      setError(t("astroPlaceRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await astrologyApi.createMember({
        name: name.trim(),
        relationship,
        dob,
        tob,
        tobUnknown: false,
        placeLabel: place.label,
        lat: place.lat,
        lng: place.lng,
        ianaTz: place.ianaTz,
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

          <Text variant="eyebrow">{t("astroDob")}</Text>
          <TextInput
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            style={inputStyle(colors)}
          />
          <Text variant="eyebrow">{t("astroTob")}</Text>
          <TextInput
            value={tob}
            onChangeText={setTob}
            placeholder="HH:MM"
            placeholderTextColor={colors.textMuted}
            style={inputStyle(colors)}
          />

          <Text variant="eyebrow">{t("astroPlace")}</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TextInput
              value={placeQuery}
              onChangeText={setPlaceQuery}
              placeholder={t("astroPlacePh")}
              placeholderTextColor={colors.textMuted}
              style={[inputStyle(colors), { flex: 1 }]}
            />
            <Button
              label={t("astroSearch")}
              variant="ghost"
              loading={geoBusy}
              onPress={() => void searchPlace()}
            />
          </View>
          {suggestions.map((s) => (
            <Pressable
              key={`${s.lat}-${s.lng}-${s.label}`}
              onPress={() => {
                setPlace(s);
                setPlaceQuery(s.label);
                setSuggestions([]);
              }}
              style={[styles.suggest, { borderColor: colors.hairline }]}
            >
              <Text variant="soft">{s.label}</Text>
            </Pressable>
          ))}
          {place ? (
            <Text variant="muted" style={{ color: colors.brassSoft }}>
              {t("astroPlaceConfirm")}: {place.label}
            </Text>
          ) : null}

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
  suggest: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
});
