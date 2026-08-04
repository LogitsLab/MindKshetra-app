import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { userApi } from "@/api/endpoints";
import {
  DAILY_TIME_OPTIONS,
  GOALS,
  GUIDANCE_STYLES,
  INSPIRATIONS,
  ONBOARDING_COPY,
  ONBOARDING_VERSION,
  PERSONALIZATION_STORAGE_KEY,
  type GoalId,
  type GuidanceStyleId,
  type InspirationId,
} from "@/data/personalization";
import { radii, spacing } from "@/theme/tokens";

/**
 * Post-onboarding settings editor — same lists as the detailed onboarding
 * wizard, without replaying the full multi-step flow.
 */
export default function PersonalizeSettingsScreen() {
  const { colors } = useTheme();
  const { lang, setLang } = useLanguage();
  const { isSignedIn, isAnonymous } = useAuth();
  const router = useRouter();
  const L = lang === "hi" ? "hi" : "en";
  const copy = ONBOARDING_COPY;

  const [goals, setGoals] = useState<GoalId[]>([]);
  const [inspirations, setInspirations] = useState<InspirationId[]>([]);
  const [dailyTimeMinutes, setDailyTimeMinutes] = useState(10);
  const [guidanceStyle, setGuidanceStyle] =
    useState<GuidanceStyleId>("balanced");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PERSONALIZATION_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        goals?: GoalId[];
        inspirations?: InspirationId[];
        dailyTimeMinutes?: number;
        guidanceStyle?: GuidanceStyleId;
        displayName?: string;
        preferredLanguage?: "en" | "hi";
      };
      if (Array.isArray(draft.goals)) setGoals(draft.goals);
      if (Array.isArray(draft.inspirations)) setInspirations(draft.inspirations);
      if (typeof draft.dailyTimeMinutes === "number") {
        setDailyTimeMinutes(draft.dailyTimeMinutes);
      }
      if (draft.guidanceStyle) setGuidanceStyle(draft.guidanceStyle);
      if (draft.displayName) setDisplayName(draft.displayName);
      if (draft.preferredLanguage === "hi" || draft.preferredLanguage === "en") {
        setLang(draft.preferredLanguage);
      }
    } catch {
      /* ignore */
    }
  }, [setLang]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  function toggleGoal(id: GoalId) {
    setGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  }

  function toggleInspiration(id: InspirationId) {
    setInspirations((g) =>
      g.includes(id) ? g.filter((x) => x !== id) : [...g, id]
    );
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    const payload = {
      goals,
      inspirations,
      dailyTimeMinutes,
      guidanceStyle,
      displayName,
      preferredLanguage: lang === "hi" ? "hi" : "en",
      skipped: false,
      onboardingVersion: ONBOARDING_VERSION,
    };
    try {
      await AsyncStorage.setItem(
        PERSONALIZATION_STORAGE_KEY,
        JSON.stringify(payload)
      );
      if (isSignedIn && !isAnonymous) {
        await userApi.completeOnboarding(payload);
      }
      setStatus(L === "hi" ? "सहेजा गया" : "Saved");
      router.back();
    } catch {
      setStatus(L === "hi" ? "सहेज नहीं सके" : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const chip = (active: boolean) => [
    styles.chip,
    {
      borderColor: active ? colors.brass : colors.line,
      backgroundColor: active ? "rgba(201,162,39,0.12)" : colors.field,
    },
  ];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.pad}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="eyebrow" color={colors.brassSoft}>
          {L === "hi" ? "सेटिंग्स" : "SETTINGS"}
        </Text>
        <Text variant="display" color={colors.brassSoft} style={styles.title}>
          {L === "hi" ? "व्यक्तिगत करें" : "Personalize"}
        </Text>
        <Text variant="soft" style={styles.blurb}>
          {L === "hi"
            ? "लक्ष्य, प्रेरणा, समय और मार्गदर्शन — जब चाहें बदलें।"
            : "Goals, inspirations, time, and guidance — edit anytime without replaying onboarding."}
        </Text>

        <Text variant="eyebrow" color={colors.brassSoft} style={styles.section}>
          {copy.setup.name[L]}
        </Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={copy.setup.namePlaceholder[L]}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.line, backgroundColor: colors.field },
          ]}
        />

        <Text variant="eyebrow" color={colors.brassSoft} style={styles.section}>
          {copy.setup.language[L]}
        </Text>
        <View style={styles.row}>
          {(["en", "hi"] as const).map((code) => (
            <Pressable
              key={code}
              onPress={() => setLang(code)}
              style={chip(lang === code)}
            >
              <Text color={lang === code ? colors.brassSoft : colors.textSoft}>
                {code === "en" ? "English" : "हिंदी"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text variant="eyebrow" color={colors.brassSoft} style={styles.section}>
          {copy.goals.title[L]}
        </Text>
        <View style={styles.wrap}>
          {GOALS.map((g) => {
            const active = goals.includes(g.id);
            return (
              <Pressable key={g.id} onPress={() => toggleGoal(g.id)} style={chip(active)}>
                <Text color={active ? colors.brassSoft : colors.textSoft}>
                  {L === "hi" ? g.hi : g.en}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text variant="eyebrow" color={colors.brassSoft} style={styles.section}>
          {copy.inspirations.title[L]}
        </Text>
        <View style={styles.wrap}>
          {INSPIRATIONS.map((item) => {
            const active = inspirations.includes(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => toggleInspiration(item.id)}
                style={chip(active)}
              >
                <Text color={active ? colors.brassSoft : colors.textSoft}>
                  {L === "hi" ? item.hi : item.en}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setInspirations([])}
            style={chip(inspirations.length === 0)}
          >
            <Text
              color={
                inspirations.length === 0 ? colors.brassSoft : colors.textSoft
              }
            >
              {copy.inspirations.none[L]}
            </Text>
          </Pressable>
        </View>

        <Text variant="eyebrow" color={colors.brassSoft} style={styles.section}>
          {copy.time.title[L]}
        </Text>
        <View style={styles.wrap}>
          {DAILY_TIME_OPTIONS.map((opt) => {
            const active = dailyTimeMinutes === opt.minutes;
            return (
              <Pressable
                key={opt.minutes}
                onPress={() => setDailyTimeMinutes(opt.minutes)}
                style={chip(active)}
              >
                <Text color={active ? colors.brassSoft : colors.textSoft}>
                  {L === "hi" ? opt.hi : opt.en}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text variant="eyebrow" color={colors.brassSoft} style={styles.section}>
          {copy.setup.guidance[L]}
        </Text>
        <View style={styles.wrap}>
          {GUIDANCE_STYLES.map((g) => {
            const active = guidanceStyle === g.id;
            return (
              <Pressable
                key={g.id}
                onPress={() => setGuidanceStyle(g.id)}
                style={chip(active)}
              >
                <Text color={active ? colors.brassSoft : colors.textSoft}>
                  {L === "hi" ? g.hi : g.en}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {busy ? (
          <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.lg }} />
        ) : (
          <View style={{ marginTop: spacing.lg }}>
            <Button
              label={L === "hi" ? "यात्रा सहेजें" : "Save journey"}
              onPress={() => void save()}
            />
          </View>
        )}
        {status ? (
          <Text variant="muted" style={{ marginTop: spacing.sm, textAlign: "center" }}>
            {status}
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { marginTop: spacing.xs },
  blurb: { marginTop: spacing.sm, marginBottom: spacing.md },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
});
