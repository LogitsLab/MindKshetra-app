import React, { useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter, Redirect } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { BrandMark } from "@/components/BrandMark";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import {
  OnboardingAuthStep,
  type AuthAction,
} from "@/components/onboarding/OnboardingAuthStep";
import {
  OnboardingBackdrop,
  useReadingVeil,
} from "@/components/onboarding/OnboardingBackdrop";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useTheme } from "@/context/ThemeContext";
import { spacing, radii } from "@/theme/tokens";
import { userApi } from "@/api/endpoints";
import {
  DAILY_TIME_OPTIONS,
  EMPTY_PERSONALIZATION,
  GOALS,
  GUIDANCE_STYLES,
  INSPIRATIONS,
  ONBOARDING_COPY,
  ONBOARDING_VERSION,
  PERSONALIZATION_STORAGE_KEY,
  type GoalId,
  type GuidanceStyleId,
  type InspirationId,
  type PersonalizationDraft,
} from "@/data/personalization";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STEPS = [
  "welcome",
  "goals",
  "inspirations",
  "time",
  "setup",
  "account",
] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, setLang } = useLanguage();
  const { markComplete, complete } = useOnboarding();
  const {
    configured,
    isSignedIn,
    signInAnonymously,
    signInWithEmail,
    signInWithGoogle,
    emailCooldownSec,
  } = useAuth();

  const [step, setStep] = useState<Step>("welcome");
  const [draft, setDraft] = useState<PersonalizationDraft>({
    ...EMPTY_PERSONALIZATION,
    preferredLanguage: lang,
  });
  const [email, setEmail] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [pending, setPending] = useState<AuthAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [guestFailed, setGuestFailed] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const flowStep = stepIndex;
  const flowTotal = STEPS.length;
  const onPoster = step === "welcome";
  const reading = useReadingVeil(!onPoster);
  const copy = ONBOARDING_COPY;
  const L = lang === "hi" ? "hi" : "en";

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  });

  if (complete || isSignedIn) {
    return <Redirect href="/(tabs)/home" />;
  }

  function goBack() {
    if (stepIndex <= 0) return false;
    setStep(STEPS[stepIndex - 1]);
    return true;
  }

  function toggleGoal(id: GoalId) {
    setDraft((d) => ({
      ...d,
      goals: d.goals.includes(id)
        ? d.goals.filter((g) => g !== id)
        : [...d.goals, id],
    }));
  }

  function toggleInspiration(id: InspirationId) {
    setDraft((d) => ({
      ...d,
      inspirations: d.inspirations.includes(id)
        ? d.inspirations.filter((g) => g !== id)
        : [...d.inspirations, id],
    }));
  }

  async function persistDraft(next: PersonalizationDraft, skipped = false) {
    const payload = { ...next, skipped };
    await AsyncStorage.setItem(
      PERSONALIZATION_STORAGE_KEY,
      JSON.stringify({ ...payload, onboardingVersion: ONBOARDING_VERSION })
    );
    try {
      if (configured) {
        await userApi.completeOnboarding({
          goals: payload.goals,
          inspirations: payload.inspirations,
          dailyTimeMinutes: payload.dailyTimeMinutes,
          guidanceStyle: payload.guidanceStyle,
          displayName: payload.displayName,
          preferredLanguage: payload.preferredLanguage,
          skipped,
        });
      }
    } catch {
      // Local draft is enough for guests / offline.
    }
  }

  async function finish(skipped = false) {
    const next = { ...draft, preferredLanguage: lang, skipped };
    await persistDraft(next, skipped);
    await markComplete();
    router.replace("/(tabs)/home");
  }

  async function onAuth(action: AuthAction) {
    setMessage(null);
    setPending(action);
    try {
      if (action === "guest") {
        const ok = await signInAnonymously();
        if (!ok) {
          setGuestFailed(true);
          setMessage(
            lang === "hi"
              ? "अतिथि साइन-इन नहीं हो सका। फिर भी जारी रखें।"
              : "Guest sign-in failed. You can continue anyway."
          );
          return;
        }
        await finish(false);
        return;
      }
      if (action === "google") {
        await signInWithGoogle();
        await finish(false);
        return;
      }
      if (action === "email") {
        const ok = await signInWithEmail(email.trim());
        if (ok) setLinkSent(true);
        else
          setMessage(
            lang === "hi" ? "ईमेल नहीं भेजा जा सका।" : "Could not send email."
          );
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(null);
    }
  }

  const selectStyle = useMemo(
    () => ({
      borderColor: colors.line,
      backgroundColor: colors.field,
    }),
    [colors]
  );

  return (
    <Screen atmosphere="hero" edges={["top", "bottom"]}>
      <OnboardingBackdrop reading={reading} />
      <View style={styles.wrap}>
        {step !== "welcome" ? (
          <OnboardingHeader
            step={flowStep + 1}
            total={flowTotal}
            onBack={() => goBack()}
          />
        ) : null}

        {step === "welcome" ? (
          <View style={styles.hero}>
            <BrandMark size={56} />
            <Text variant="display" style={{ color: colors.onMedia, marginTop: spacing.md }}>
              {copy.welcome.title[L]}
            </Text>
            <Text variant="soft" style={{ color: colors.onMediaMuted, marginTop: spacing.xs }}>
              {copy.welcome.subtitle[L]}
            </Text>
            <Text
              variant="body"
              style={{
                color: colors.onMediaMuted,
                textAlign: "center",
                marginTop: spacing.lg,
                paddingHorizontal: spacing.lg,
              }}
            >
              {copy.welcome.tagline[L]}
            </Text>
            <View style={styles.ctaCol}>
              <Button
                label={copy.welcome.continue[L]}
                onPress={() => setStep("goals")}
              />
              <Pressable onPress={() => finish(true)} hitSlop={12}>
                <Text variant="muted" style={{ color: colors.onMediaMuted, textAlign: "center" }}>
                  {copy.welcome.skip[L]}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {step === "goals" ? (
          <ScrollView contentContainerStyle={styles.pad}>
            <Text variant="display">{copy.goals.title[L]}</Text>
            <Text variant="soft" style={{ marginTop: spacing.sm }}>
              {copy.goals.body[L]}
            </Text>
            <View style={styles.grid}>
              {GOALS.map((g) => {
                const on = draft.goals.includes(g.id);
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => toggleGoal(g.id)}
                    style={[
                      styles.tile,
                      selectStyle,
                      on && { borderColor: colors.brass },
                    ]}
                  >
                    <Text variant="body">{g[L]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Button
              label={copy.goals.next[L]}
              onPress={() => setStep("inspirations")}
              style={{ marginTop: spacing.lg }}
            />
            <Pressable onPress={() => finish(true)} style={{ marginTop: spacing.md }}>
              <Text variant="muted" style={{ textAlign: "center" }}>
                {copy.welcome.skip[L]}
              </Text>
            </Pressable>
          </ScrollView>
        ) : null}

        {step === "inspirations" ? (
          <ScrollView contentContainerStyle={styles.pad}>
            <Text variant="display">{copy.inspirations.title[L]}</Text>
            <Text variant="soft" style={{ marginTop: spacing.sm }}>
              {copy.inspirations.body[L]}
            </Text>
            <View style={styles.grid}>
              {INSPIRATIONS.map((g) => {
                const on = draft.inspirations.includes(g.id);
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => toggleInspiration(g.id)}
                    style={[
                      styles.tile,
                      selectStyle,
                      on && { borderColor: colors.brass },
                    ]}
                  >
                    <Text variant="body">{g[L]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Button
              label={copy.inspirations.none[L]}
              variant="ghost"
              onPress={() => {
                setDraft((d) => ({ ...d, inspirations: [] }));
                setStep("time");
              }}
              style={{ marginTop: spacing.lg }}
            />
            <Button
              label={copy.inspirations.next[L]}
              onPress={() => setStep("time")}
              style={{ marginTop: spacing.sm }}
            />
          </ScrollView>
        ) : null}

        {step === "time" ? (
          <ScrollView contentContainerStyle={styles.pad}>
            <Text variant="display">{copy.time.title[L]}</Text>
            <Text variant="soft" style={{ marginTop: spacing.sm }}>
              {copy.time.body[L]}
            </Text>
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              {DAILY_TIME_OPTIONS.map((o) => {
                const on = draft.dailyTimeMinutes === o.minutes;
                return (
                  <Pressable
                    key={o.minutes}
                    onPress={() =>
                      setDraft((d) => ({ ...d, dailyTimeMinutes: o.minutes }))
                    }
                    style={[
                      styles.row,
                      selectStyle,
                      on && { borderColor: colors.brass },
                    ]}
                  >
                    <Text variant="body">{o[L]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Button
              label={copy.time.next[L]}
              onPress={() => setStep("setup")}
              style={{ marginTop: spacing.lg }}
            />
          </ScrollView>
        ) : null}

        {step === "setup" ? (
          <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
            <Text variant="display">{copy.setup.title[L]}</Text>
            <Text variant="eyebrow" style={{ marginTop: spacing.lg }}>
              {copy.setup.language[L]}
            </Text>
            <View style={styles.rowPair}>
              {(["en", "hi"] as const).map((code) => (
                <Pressable
                  key={code}
                  onPress={() => {
                    setLang(code);
                    setDraft((d) => ({ ...d, preferredLanguage: code }));
                  }}
                  style={[
                    styles.half,
                    selectStyle,
                    draft.preferredLanguage === code && {
                      borderColor: colors.brass,
                    },
                  ]}
                >
                  <Text variant="body">{code === "en" ? "English" : "हिंदी"}</Text>
                </Pressable>
              ))}
            </View>
            <Text variant="eyebrow" style={{ marginTop: spacing.lg }}>
              {copy.setup.guidance[L]}
            </Text>
            {GUIDANCE_STYLES.map((g) => {
              const on = draft.guidanceStyle === g.id;
              return (
                <Pressable
                  key={g.id}
                  onPress={() =>
                    setDraft((d) => ({
                      ...d,
                      guidanceStyle: g.id as GuidanceStyleId,
                    }))
                  }
                  style={[
                    styles.row,
                    selectStyle,
                    { marginTop: spacing.sm },
                    on && { borderColor: colors.brass },
                  ]}
                >
                  <Text variant="body">{g[L]}</Text>
                </Pressable>
              );
            })}
            <Text variant="eyebrow" style={{ marginTop: spacing.lg }}>
              {copy.setup.name[L]}
            </Text>
            <TextInput
              value={draft.displayName}
              onChangeText={(displayName) =>
                setDraft((d) => ({ ...d, displayName }))
              }
              placeholder={copy.setup.namePlaceholder[L]}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.line, backgroundColor: colors.field },
              ]}
            />
            <Text variant="soft" style={{ marginTop: spacing.md, textAlign: "center" }}>
              {copy.setup.creating[L]}
            </Text>
            <Button
              label={copy.setup.start[L]}
              onPress={() => setStep("account")}
              style={{ marginTop: spacing.lg }}
            />
          </ScrollView>
        ) : null}

        {step === "account" ? (
          <ScrollView contentContainerStyle={styles.pad}>
            <OnboardingAuthStep
              configured={configured}
              pending={pending}
              message={message}
              email={email}
              emailOpen={emailOpen}
              linkSent={linkSent}
              emailCooldownSec={emailCooldownSec}
              guestFailed={guestFailed}
              onEmailChange={setEmail}
              onEmailOpen={() => setEmailOpen(true)}
              onGoogle={() => onAuth("google")}
              onEmailSubmit={() => onAuth("email")}
              onGuest={() => onAuth("guest")}
              onEnterAnyway={() => finish(false)}
            />
          </ScrollView>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  ctaCol: { marginTop: spacing.xxl, width: "100%", gap: spacing.md },
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  tile: {
    width: "47%",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
  },
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
  },
  rowPair: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  half: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
  },
  input: {
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: "Sora_400Regular",
    fontSize: 16,
  },
});
