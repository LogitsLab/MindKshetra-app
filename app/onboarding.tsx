import React, { useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ImageSourcePropType,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { BrandMark } from "@/components/BrandMark";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import {
  OnboardingAuthStep,
  type AuthAction,
} from "@/components/onboarding/OnboardingAuthStep";
import { OnboardingBackdrop } from "@/components/onboarding/OnboardingBackdrop";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useTheme } from "@/context/ThemeContext";
import { images } from "@/theme/assets";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
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

const STEPS = [
  "welcome",
  "goals",
  "inspirations",
  "time",
  "setup",
  "account",
] as const;
type Step = (typeof STEPS)[number];

const INSPIRATION_IMAGES: Record<InspirationId, ImageSourcePropType> = {
  krishna: images.madhavPortrait,
  shiva: images.pathMeditation,
  rama: images.pathExplore,
  devi: images.pathMood,
  hanuman: images.pathSadhana,
  buddha: images.pathCommunity,
};

const GOAL_ICONS: Record<GoalId, string> = {
  inner_peace: "⌁",
  stress_relief: "≋",
  self_realization: "◉",
  devotion: "♧",
  purpose: "◈",
  healing: "⌁",
  knowledge: "▤",
  relationships: "∞",
  other: "•••",
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    setDraft((current) => ({
      ...current,
      goals: current.goals.includes(id)
        ? current.goals.filter((goal) => goal !== id)
        : [...current.goals, id],
    }));
  }

  function toggleInspiration(id: InspirationId) {
    setDraft((current) => ({
      ...current,
      inspirations: current.inspirations.includes(id)
        ? current.inspirations.filter((inspiration) => inspiration !== id)
        : [...current.inspirations, id],
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
      // The local draft remains the source of truth for guests and offline use.
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
        await signInAnonymously();
        await finish(false);
        return;
      }
      if (action === "google") {
        const completed = await signInWithGoogle();
        if (completed) await finish(false);
        return;
      }
      await signInWithEmail(email.trim());
      setLinkSent(true);
    } catch (error) {
      if (action === "guest") {
        setGuestFailed(true);
        setMessage(
          lang === "hi"
            ? "अतिथि साइन-इन नहीं हो सका। फिर भी जारी रखें।"
            : "Guest sign-in failed. You can continue anyway."
        );
      } else {
        setMessage(error instanceof Error ? error.message : "Something went wrong");
      }
    } finally {
      setPending(null);
    }
  }

  const header = step !== "welcome" ? (
    <OnboardingHeader
      step={stepIndex}
      total={STEPS.length}
      onBack={goBack}
      onSkip={
        step === "inspirations"
          ? () => {
              setDraft((current) => ({ ...current, inspirations: [] }));
              setStep("time");
            }
          : undefined
      }
    />
  ) : null;

  return (
    <Screen
      atmosphere="none"
      padded={false}
      edges={["top", "bottom"]}
      style={styles.screen}
    >
      {step === "welcome" ? <OnboardingBackdrop reading={0} /> : null}
      <View style={styles.wrap}>
        {header}

        {step === "welcome" ? (
          <View style={styles.welcome}>
            <View style={styles.welcomeBrand}>
              <BrandMark size={64} />
              <Text variant="display" color={colors.brassSoft} style={styles.brandTitle}>
                {copy.welcome.title[L]}
              </Text>
              <Text variant="eyebrow" color={colors.onMedia} style={styles.brandSubtitle}>
                {copy.welcome.subtitle[L]}
              </Text>
            </View>
            <Text variant="title" color={colors.onMedia} style={styles.tagline}>
              “{copy.welcome.tagline[L]}”
            </Text>
            <View style={styles.welcomeActions}>
              <OnboardingProgress step={0} total={STEPS.length} />
              <Button
                label={`${copy.welcome.continue[L]}  →`}
                onPress={() => setStep("goals")}
                style={styles.primaryButton}
              />
              <Pressable onPress={() => finish(true)} hitSlop={12} style={styles.skipLink}>
                <Text variant="eyebrow" color={colors.onMediaMuted}>
                  {copy.welcome.skip[L]}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {step === "goals" ? (
          <ScrollView contentContainerStyle={styles.page}>
            <Text variant="display" style={styles.pageTitle}>
              {copy.goals.title[L]}
            </Text>
            <Text variant="soft" style={styles.centeredBody}>
              {copy.goals.body[L]}
            </Text>
            <View style={styles.goalGrid}>
              {GOALS.map((goal) => {
                const selected = draft.goals.includes(goal.id);
                return (
                  <Pressable
                    key={goal.id}
                    onPress={() => toggleGoal(goal.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    style={({ pressed }) => [
                      styles.goalTile,
                      selected && styles.selectedTile,
                      pressed && styles.pressed,
                    ]}
                  >
                    {selected ? <SelectionCheck compact /> : null}
                    <Text color={colors.brass} style={styles.goalIcon}>
                      {GOAL_ICONS[goal.id]}
                    </Text>
                    <Text variant="muted" color={colors.text} style={styles.goalLabel}>
                      {goal[L]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.bottomActions}>
              <Button
                label={copy.goals.next[L]}
                onPress={() => setStep("inspirations")}
                style={styles.primaryButton}
              />
              <Pressable onPress={() => finish(true)} style={styles.skipLink}>
                <Text variant="eyebrow">{copy.welcome.skip[L]}</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : null}

        {step === "inspirations" ? (
          <ScrollView contentContainerStyle={styles.page}>
            <Text variant="title" color={colors.brassSoft}>
              {copy.inspirations.title[L]}
            </Text>
            <Text variant="soft" style={styles.inspirationBody}>
              {copy.inspirations.body[L]}
            </Text>
            <View style={styles.inspirationGrid}>
              {INSPIRATIONS.map((inspiration) => {
                const selected = draft.inspirations.includes(inspiration.id);
                return (
                  <Pressable
                    key={inspiration.id}
                    onPress={() => toggleInspiration(inspiration.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    style={({ pressed }) => [
                      styles.inspirationTile,
                      selected && styles.selectedTile,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Image
                      source={INSPIRATION_IMAGES[inspiration.id]}
                      style={styles.inspirationImage}
                      resizeMode="cover"
                    />
                    {selected ? <SelectionCheck /> : null}
                    <View style={styles.imageScrim} />
                    <Text variant="title" color={colors.onMedia} style={styles.inspirationName}>
                      {inspiration[L]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Button
              label={copy.inspirations.next[L]}
              onPress={() => setStep("time")}
              style={styles.sectionButton}
            />
          </ScrollView>
        ) : null}

        {step === "time" ? (
          <ScrollView contentContainerStyle={styles.page}>
            <Text variant="display" color={colors.brassSoft} style={styles.pageTitle}>
              {copy.time.title[L]}
            </Text>
            <Text variant="soft" style={styles.centeredBody}>
              {copy.time.body[L]}
            </Text>
            <View style={styles.timeList}>
              {DAILY_TIME_OPTIONS.map((option) => {
                const selected = draft.dailyTimeMinutes === option.minutes;
                return (
                  <Pressable
                    key={option.minutes}
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        dailyTimeMinutes: option.minutes,
                      }))
                    }
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.choiceRow,
                      selected && styles.selectedRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ClockIcon color={colors.brass} />
                    <Text variant="muted" color={colors.text} style={styles.choiceLabel}>
                      {option[L]}
                    </Text>
                    {selected ? (
                      <SelectionCheck inline />
                    ) : (
                      <View style={styles.emptyRadio} />
                    )}
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.bottomActions}>
              <Button
                label={copy.time.next[L]}
                onPress={() => setStep("setup")}
                style={styles.primaryButton}
              />
              <Pressable onPress={() => setStep("setup")} style={styles.skipLink}>
                <Text variant="muted">{copy.welcome.skip[L]}</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : null}

        {step === "setup" ? (
          <ScrollView
            contentContainerStyle={styles.page}
            keyboardShouldPersistTaps="handled"
          >
            <Text variant="display">{copy.setup.title[L]}</Text>
            <Text variant="soft" style={styles.setupIntro}>
              {copy.setup.creating[L]}
            </Text>

            <Text variant="eyebrow" color={colors.brassSoft} style={styles.fieldLabel}>
              {copy.setup.language[L]}
            </Text>
            <View style={styles.languageRow}>
              {(["en", "hi"] as const).map((code) => {
                const selected = draft.preferredLanguage === code;
                return (
                  <Pressable
                    key={code}
                    onPress={() => {
                      setLang(code);
                      setDraft((current) => ({
                        ...current,
                        preferredLanguage: code,
                      }));
                    }}
                    style={({ pressed }) => [
                      styles.languageChoice,
                      selected && styles.selectedTile,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      variant="muted"
                      color={selected ? colors.brassSoft : colors.textSoft}
                      style={styles.choiceText}
                    >
                      {code === "en" ? "English" : "हिंदी"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text variant="eyebrow" color={colors.brassSoft} style={styles.fieldLabel}>
              {copy.setup.guidance[L]}
            </Text>
            <View style={styles.guidanceList}>
              {GUIDANCE_STYLES.map((guidance) => {
                const selected = draft.guidanceStyle === guidance.id;
                return (
                  <Pressable
                    key={guidance.id}
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        guidanceStyle: guidance.id as GuidanceStyleId,
                      }))
                    }
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.choiceRow,
                      selected && styles.selectedRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      variant="muted"
                      color={selected ? colors.brassSoft : colors.textSoft}
                      style={[styles.choiceLabel, styles.choiceText]}
                    >
                      {guidance[L]}
                    </Text>
                    {selected ? <SelectionCheck inline /> : <View style={styles.emptyRadio} />}
                  </Pressable>
                );
              })}
            </View>

            <Text variant="eyebrow" color={colors.brassSoft} style={styles.fieldLabel}>
              {copy.setup.name[L]}
            </Text>
            <TextInput
              value={draft.displayName}
              onChangeText={(displayName) =>
                setDraft((current) => ({ ...current, displayName }))
              }
              placeholder={copy.setup.namePlaceholder[L]}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <Button
              label={copy.setup.start[L]}
              onPress={() => setStep("account")}
              style={styles.setupButton}
            />
            <Pressable onPress={() => setStep("account")} style={styles.skipLink}>
              <Text variant="muted">
                {L === "hi" ? "अभी के लिए छोड़ें" : "Skip for now"}
              </Text>
            </Pressable>
            <View style={styles.setupMark}>
              <BrandMark size={30} />
            </View>
          </ScrollView>
        ) : null}

        {step === "account" ? (
          <ScrollView contentContainerStyle={styles.page}>
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

function SelectionCheck({
  compact = false,
  inline = false,
}: {
  compact?: boolean;
  inline?: boolean;
}) {
  return (
    <View
      style={[
        sharedStyles.check,
        compact && sharedStyles.checkCompact,
        inline ? sharedStyles.checkInline : sharedStyles.checkCorner,
      ]}
    >
      <Svg width={compact ? 8 : 10} height={compact ? 8 : 10} viewBox="0 0 12 12">
        <Path
          d="M2.5 6.2l2.1 2.1 4.9-5"
          fill="none"
          stroke="#07090f"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 20 20" fill="none">
      <Circle cx="10" cy="10" r="6.5" stroke={color} strokeWidth="1.4" />
      <Path
        d="M10 6.5V10l2.5 1.7"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </Svg>
  );
}

const sharedStyles = StyleSheet.create({
  check: {
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2c45a",
  },
  checkCompact: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  checkCorner: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 3,
  },
  checkInline: {
    position: "relative",
  },
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      backgroundColor: colors.void,
    },
    wrap: {
      flex: 1,
    },
    page: {
      flexGrow: 1,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
    },
    welcome: {
      flex: 1,
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },
    welcomeBrand: {
      alignItems: "center",
      marginTop: spacing.xl,
    },
    brandTitle: {
      marginTop: spacing.md,
      fontSize: 27,
    },
    brandSubtitle: {
      marginTop: spacing.xs,
      letterSpacing: 2.4,
    },
    tagline: {
      maxWidth: 310,
      textAlign: "center",
      fontFamily: "Fraunces_600SemiBold",
      fontStyle: "italic",
      lineHeight: 30,
    },
    welcomeActions: {
      width: "100%",
      gap: spacing.md,
      alignItems: "center",
    },
    primaryButton: {
      width: "100%",
      minHeight: 54,
    },
    pageTitle: {
      textAlign: "center",
    },
    centeredBody: {
      marginTop: spacing.sm,
      textAlign: "center",
    },
    goalGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    goalTile: {
      width: "31.7%",
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xs,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radii.sm,
      backgroundColor: colors.surface,
    },
    selectedTile: {
      borderColor: colors.brass,
      backgroundColor: "rgba(201,162,39,0.06)",
    },
    goalIcon: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 22,
      lineHeight: 26,
    },
    goalLabel: {
      marginTop: spacing.xs,
      textAlign: "center",
      fontSize: 10,
      lineHeight: 13,
    },
    bottomActions: {
      marginTop: "auto",
      paddingTop: spacing.xl,
      gap: spacing.md,
    },
    skipLink: {
      minHeight: 30,
      alignItems: "center",
      justifyContent: "center",
    },
    inspirationBody: {
      marginTop: spacing.sm,
      maxWidth: 330,
    },
    inspirationGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    inspirationTile: {
      width: "48.7%",
      height: 190,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radii.sm,
      backgroundColor: colors.field,
    },
    inspirationImage: {
      width: "100%",
      height: "100%",
    },
    imageScrim: {
      ...StyleSheet.absoluteFillObject,
      top: "48%",
      backgroundColor: "rgba(7,9,15,0.58)",
    },
    inspirationName: {
      position: "absolute",
      left: spacing.sm,
      bottom: spacing.sm,
      fontSize: 18,
      lineHeight: 22,
    },
    sectionButton: {
      marginTop: spacing.lg,
    },
    timeList: {
      gap: spacing.sm,
      marginTop: spacing.xl,
    },
    choiceRow: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radii.sm,
      backgroundColor: colors.surface,
    },
    selectedRow: {
      borderColor: colors.brass,
      backgroundColor: colors.field,
    },
    choiceLabel: {
      flex: 1,
      marginLeft: spacing.sm,
      fontSize: 13,
    },
    emptyRadio: {
      width: 17,
      height: 17,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.textMuted,
    },
    setupIntro: {
      marginTop: spacing.xs,
      fontStyle: "italic",
    },
    fieldLabel: {
      marginTop: spacing.lg,
    },
    languageRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    languageChoice: {
      flex: 1,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radii.sm,
      backgroundColor: colors.surface,
    },
    guidanceList: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    choiceText: {
      fontFamily: "Sora_600SemiBold",
    },
    input: {
      minHeight: 48,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radii.sm,
      backgroundColor: colors.inputBg,
      fontFamily: "Sora_400Regular",
      fontSize: 15,
    },
    setupButton: {
      marginTop: spacing.md,
    },
    setupMark: {
      alignItems: "center",
      marginTop: spacing.sm,
      opacity: 0.65,
    },
    pressed: {
      opacity: 0.72,
    },
  });
}
