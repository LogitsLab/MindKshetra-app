import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { BrandMark } from "@/components/BrandMark";
import { GoalIcon } from "@/components/GoalIcon";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
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
import { images } from "@/theme/assets";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import { userApi } from "@/api/endpoints";
import {
  DAILY_TIME_OPTIONS,
  EMPTY_PERSONALIZATION,
  GOALS,
  GUIDANCE_STYLES,
  ONBOARDING_COPY,
  ONBOARDING_VERSION,
  PERSONALIZATION_STORAGE_KEY,
  type GoalId,
  type GuidanceStyleId,
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

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { lang, setLang } = useLanguage();
  const { markComplete, complete, forceReplay } = useOnboarding();
  const {
    configured,
    isSignedIn,
    signInAnonymously,
    signInWithEmail,
    signInWithGoogle,
    emailCooldownSec,
  } = useAuth();

  const pagerRef = useRef<FlatList<Step>>(null);
  const [stepIndex, setStepIndex] = useState(0);
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

  const step = STEPS[stepIndex];
  const copy = ONBOARDING_COPY;
  const L = lang === "hi" ? "hi" : "en";
  const reading = useReadingVeil(stepIndex > 0);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(STEPS.length - 1, index));
      setStepIndex(clamped);
      pagerRef.current?.scrollToIndex({ index: clamped, animated: true });
    },
    []
  );

  const goBack = useCallback(() => {
    if (stepIndex <= 0) return false;
    goTo(stepIndex - 1);
    return true;
  }, [goTo, stepIndex]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => sub.remove();
  }, [goBack]);

  /**
   * Bound to onScroll as well as onMomentumScrollEnd. A slow drag released
   * without flick produces no momentum event on iOS, so momentum alone left the
   * pager on the next page while progress still read the previous one.
   */
  function onPagerScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width <= 0) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    const clamped = Math.max(0, Math.min(STEPS.length - 1, index));
    if (clamped !== stepIndex) setStepIndex(clamped);
  }

  if (!forceReplay && (complete || isSignedIn)) {
    return <Redirect href="/(tabs)/home" />;
  }

  function toggleGoal(id: GoalId) {
    setDraft((current) => ({
      ...current,
      goals: current.goals.includes(id)
        ? current.goals.filter((goal) => goal !== id)
        : [...current.goals, id],
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

  function renderWelcome() {
    return (
      <View style={styles.welcome}>
        <View style={styles.welcomeBrand}>
          <BrandMark size={64} />
          <Text
            variant="display"
            color={colors.onMedia}
            accessibilityRole="header"
            style={styles.brandTitle}
          >
            {copy.welcome.title[L]}
          </Text>
          <Text
            variant="eyebrow"
            color={colors.onMediaMuted}
            style={styles.brandSubtitle}
          >
            {copy.welcome.subtitle[L]}
          </Text>
        </View>
        <Text variant="title" color={colors.onMedia} style={styles.tagline}>
          “{copy.welcome.tagline[L]}”
        </Text>
        <View style={styles.welcomeActions}>
          <OnboardingProgress step={0} total={STEPS.length} />
          <Button
            testID="onboarding-continue"
            label={`${copy.welcome.continue[L]}  →`}
            onPress={() => goTo(1)}
            style={styles.primaryButton}
          />
          <Pressable onPress={() => finish(true)} hitSlop={12} style={styles.skipLink}>
            <Text variant="eyebrow" color={colors.onMediaMuted}>
              {copy.welcome.skip[L]}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderGoals() {
    return (
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <Text
          variant="display"
          color={colors.onMedia}
          accessibilityRole="header"
          style={styles.pageTitle}
        >
          {copy.goals.title[L]}
        </Text>
        <Text variant="soft" color={colors.onMediaMuted} style={styles.centeredBody}>
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
                <View style={styles.goalIconWrap}>
                  <GoalIcon
                    id={goal.id}
                    color={selected ? colors.brassSoft : colors.brass}
                    size={28}
                  />
                </View>
                <Text
                  variant="muted"
                  color={selected ? colors.brassSoft : colors.onMedia}
                  style={styles.goalLabel}
                >
                  {goal[L]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.bottomActions}>
          <Button
            testID="onboarding-goals-next"
            label={copy.goals.next[L]}
            onPress={() => goTo(2)}
            style={styles.primaryButton}
          />
          <Pressable onPress={() => finish(true)} style={styles.skipLink}>
            <Text variant="eyebrow" color={colors.onMediaMuted}>
              {copy.welcome.skip[L]}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  function renderInspirations() {
    const dialogue = copy.inspirations.dialogue;
    const sloka = copy.inspirations.sloka;
    return (
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <Text variant="eyebrow" color={colors.brassSoft} style={styles.sceneEyebrow}>
          {copy.inspirations.eyebrow[L]}
        </Text>
        <Text
          variant="display"
          color={colors.onMedia}
          accessibilityRole="header"
          style={styles.sceneTitle}
        >
          {copy.inspirations.sceneTitle[L]}
        </Text>
        <Text
          variant="soft"
          color={colors.onMediaMuted}
          style={styles.inspirationBody}
        >
          {copy.inspirations.body[L]}
        </Text>

        <View style={styles.dialogueHero}>
          <Image
            source={images.pathMadhav}
            style={styles.dialogueImage}
            resizeMode="cover"
            accessibilityLabel="Madhav and Arjun on the battlefield of Kurukshetra"
          />
          <LinearGradient
            colors={["transparent", "rgba(7,9,15,0.45)", "rgba(7,9,15,0.88)"]}
            locations={[0.4, 0.75, 1]}
            style={styles.dialogueHeroFade}
          />
        </View>

        <View style={styles.chatThread}>
          <View style={styles.chatRowLeft}>
            <Image
              source={images.arjunPortrait}
              style={styles.chatAvatar}
              resizeMode="cover"
              accessibilityLabel={dialogue.arjun.label[L]}
            />
            <View style={[styles.chatBubble, styles.chatBubbleLeft]}>
              <Text variant="eyebrow" color={colors.onMediaMuted}>
                {dialogue.arjun.label[L]}
              </Text>
              <Text variant="sanskrit" color={colors.onMedia} style={styles.chatHi}>
                {dialogue.arjun.hi}
              </Text>
              <Text variant="soft" color={colors.onMediaMuted} style={styles.chatEn}>
                {dialogue.arjun.en}
              </Text>
            </View>
          </View>

          <View style={styles.chatRowRight}>
            <View style={[styles.chatBubble, styles.chatBubbleRight]}>
              <Text variant="eyebrow" color={colors.brassSoft}>
                {dialogue.krishna.label[L]}
              </Text>
              <Text variant="sanskrit" color={colors.brassSoft} style={styles.chatHi}>
                {dialogue.krishna.hi}
              </Text>
              <Text variant="soft" color={colors.onMediaMuted} style={styles.chatEn}>
                {dialogue.krishna.en}
              </Text>
            </View>
            <Image
              source={images.madhavPortrait}
              style={[styles.chatAvatar, styles.chatAvatarMadhav]}
              resizeMode="cover"
              accessibilityLabel={dialogue.krishna.label[L]}
            />
          </View>
        </View>

        <View style={styles.slokaCard}>
          <Text variant="eyebrow" color={colors.brassSoft}>
            {sloka.ref[L]}
          </Text>
          <Text variant="sanskrit" color={colors.onMedia} style={styles.slokaSanskrit}>
            {sloka.sanskrit}
          </Text>
          <Text variant="soft" color={colors.onMediaMuted} style={styles.slokaMeaning}>
            {sloka[L]}
          </Text>
        </View>

        <View style={styles.bottomActions}>
          <Button
            testID="onboarding-inspirations-next"
            label={copy.inspirations.next[L]}
            onPress={() => {
              setDraft((current) => ({ ...current, inspirations: ["krishna"] }));
              goTo(3);
            }}
            style={styles.primaryButton}
          />
          <Pressable
            onPress={() => {
              setDraft((current) => ({ ...current, inspirations: [] }));
              goTo(3);
            }}
            style={styles.skipLink}
          >
            <Text variant="eyebrow" color={colors.onMediaMuted}>
              {copy.welcome.skip[L]}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  function renderTime() {
    return (
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <Text
          variant="display"
          color={colors.onMedia}
          accessibilityRole="header"
          style={styles.pageTitle}
        >
          {copy.time.title[L]}
        </Text>
        <Text variant="soft" color={colors.onMediaMuted} style={styles.centeredBody}>
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
                <ClockIcon color={colors.brassSoft} />
                <Text
                  variant="muted"
                  color={selected ? colors.brassSoft : colors.onMedia}
                  style={styles.choiceLabel}
                >
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
            testID="onboarding-time-next"
            label={copy.time.next[L]}
            onPress={() => goTo(4)}
            style={styles.primaryButton}
          />
          <Pressable onPress={() => goTo(4)} style={styles.skipLink}>
            <Text variant="eyebrow" color={colors.onMediaMuted}>
              {copy.welcome.skip[L]}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  function renderSetup() {
    return (
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <Text
          variant="display"
          color={colors.onMedia}
          accessibilityRole="header"
        >
          {copy.setup.title[L]}
        </Text>
        <Text variant="soft" color={colors.onMediaMuted} style={styles.setupIntro}>
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
                  color={selected ? colors.brassSoft : colors.onMedia}
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
        <Text variant="soft" color={colors.onMediaMuted} style={styles.guidanceBody}>
          {copy.setup.guidanceBody[L]}
        </Text>
        <View style={styles.guidanceList}>
          {GUIDANCE_STYLES.map((guidance) => {
            const selected = draft.guidanceStyle === guidance.id;
            const blurb = L === "hi" ? guidance.blurbHi : guidance.blurbEn;
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
                  styles.guidanceRow,
                  selected && styles.selectedRow,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.guidanceCopy}>
                  <Text
                    variant="muted"
                    color={selected ? colors.brassSoft : colors.onMedia}
                    style={styles.choiceText}
                  >
                    {guidance[L]}
                  </Text>
                  <Text
                    variant="soft"
                    color={colors.onMediaMuted}
                    style={styles.guidanceBlurb}
                  >
                    {blurb}
                  </Text>
                </View>
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
          placeholderTextColor={colors.onMediaMuted}
          style={[styles.input, { color: colors.onMedia }]}
        />
        <View style={styles.bottomActions}>
          <Button
            testID="onboarding-setup-next"
            label={copy.setup.start[L]}
            onPress={() => goTo(5)}
            style={styles.primaryButton}
          />
          <Pressable onPress={() => goTo(5)} style={styles.skipLink}>
            <Text variant="eyebrow" color={colors.onMediaMuted}>
              {copy.welcome.skip[L]}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  function renderAccount() {
    return (
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
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
    );
  }

  function renderStep(item: Step) {
    switch (item) {
      case "welcome":
        return renderWelcome();
      case "goals":
        return renderGoals();
      case "inspirations":
        return renderInspirations();
      case "time":
        return renderTime();
      case "setup":
        return renderSetup();
      case "account":
        return renderAccount();
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.void }]}>
      <OnboardingBackdrop reading={reading} />
      <Screen
        atmosphere="none"
        padded={false}
        edges={["top", "bottom"]}
        style={styles.transparent}
      >
        <View style={styles.wrap}>
          {stepIndex > 0 ? (
            <OnboardingHeader
              step={stepIndex}
              total={STEPS.length}
              onBack={goBack}
            />
          ) : (
            <View style={styles.welcomeHeaderSpacer} />
          )}

          <FlatList
            ref={pagerRef}
            horizontal
            pagingEnabled
            data={[...STEPS]}
            keyExtractor={(item) => item}
            style={styles.pager}
            showsHorizontalScrollIndicator={false}
            onScroll={onPagerScroll}
            onMomentumScrollEnd={onPagerScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onScrollToIndexFailed={({ index }) => {
              requestAnimationFrame(() => {
                pagerRef.current?.scrollToIndex({ index, animated: true });
              });
            }}
            renderItem={({ item }) => (
              <View style={[styles.slide, { width }]}>{renderStep(item)}</View>
            )}
          />
        </View>
      </Screen>
    </View>
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
    root: {
      flex: 1,
    },
    transparent: {
      backgroundColor: "transparent",
    },
    wrap: {
      flex: 1,
    },
    pager: {
      flex: 1,
    },
    slide: {
      flex: 1,
    },
    welcomeHeaderSpacer: {
      height: spacing.sm,
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
      fontSize: 40,
      lineHeight: 44,
      textAlign: "center",
    },
    brandSubtitle: {
      marginTop: spacing.sm,
      letterSpacing: 2.4,
    },
    tagline: {
      maxWidth: 310,
      textAlign: "center",
      fontFamily: "Fraunces_600SemiBold",
      fontStyle: "italic",
      fontSize: 18,
      lineHeight: 26,
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
    goalIconWrap: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 30,
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
    sceneEyebrow: {
      marginBottom: spacing.xs,
    },
    sceneTitle: {
      maxWidth: 320,
    },
    inspirationBody: {
      marginTop: spacing.sm,
      maxWidth: 300,
    },
    dialogueHero: {
      marginTop: spacing.lg,
      height: 168,
      overflow: "hidden",
      borderRadius: radii.md,
      backgroundColor: colors.field,
    },
    dialogueImage: {
      ...StyleSheet.absoluteFillObject,
      width: "100%",
      height: "100%",
    },
    dialogueHeroFade: {
      ...StyleSheet.absoluteFillObject,
    },
    chatThread: {
      marginTop: spacing.lg,
      gap: spacing.md,
    },
    chatRowLeft: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.sm,
      maxWidth: "94%",
      alignSelf: "flex-start",
    },
    chatRowRight: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.sm,
      maxWidth: "94%",
      alignSelf: "flex-end",
    },
    chatAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "rgba(238,242,247,0.18)",
      backgroundColor: colors.field,
    },
    chatAvatarMadhav: {
      borderColor: "rgba(201,162,39,0.45)",
    },
    chatBubble: {
      flexShrink: 1,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      gap: 2,
    },
    chatBubbleLeft: {
      borderColor: "rgba(238,242,247,0.12)",
      backgroundColor: "rgba(14,20,32,0.72)",
      borderBottomLeftRadius: 4,
    },
    chatBubbleRight: {
      borderColor: "rgba(201,162,39,0.35)",
      backgroundColor: "rgba(201,162,39,0.1)",
      borderBottomRightRadius: 4,
    },
    chatHi: {
      marginTop: 2,
      fontSize: 18,
      lineHeight: 28,
    },
    chatEn: {
      fontFamily: "Fraunces_500Medium",
      fontStyle: "italic",
      fontSize: 13,
      lineHeight: 18,
    },
    slokaCard: {
      marginTop: spacing.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: "rgba(14,20,32,0.55)",
      gap: spacing.sm,
    },
    slokaSanskrit: {
      fontSize: 17,
      lineHeight: 28,
    },
    slokaMeaning: {
      fontFamily: "Fraunces_500Medium",
      fontStyle: "italic",
      fontSize: 14,
      lineHeight: 21,
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
    guidanceBody: {
      marginTop: spacing.sm,
      maxWidth: 340,
      fontSize: 13,
      lineHeight: 19,
    },
    guidanceList: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    guidanceRow: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radii.sm,
      backgroundColor: colors.surface,
      gap: spacing.sm,
    },
    guidanceCopy: {
      flex: 1,
      gap: 4,
    },
    guidanceBlurb: {
      fontSize: 12,
      lineHeight: 17,
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
    pressed: {
      opacity: 0.72,
    },
  });
}
