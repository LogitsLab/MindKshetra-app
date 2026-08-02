import React, { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useRouter, Redirect } from "expo-router";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { OnboardingHeroSlide } from "@/components/onboarding/OnboardingHeroSlide";
import { OnboardingPathsSlide } from "@/components/onboarding/OnboardingPathsSlide";
import { OnboardingLanguageStep } from "@/components/onboarding/OnboardingLanguageStep";
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
import { spacing } from "@/theme/tokens";

const MAIN_STEPS = ["welcome", "language", "account"] as const;
type MainStep = (typeof MAIN_STEPS)[number];

/**
 * Four screens, counted the same way from start to finish: the two welcome
 * pages, language, account. `welcome` is one MAIN_STEP holding a two-page
 * pager, but the person going through it is looking at four screens, so that
 * is what progress reports.
 */
const FLOW_TOTAL = 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const { markComplete, complete } = useOnboarding();
  const {
    configured,
    signInAnonymously,
    signInWithEmail,
    signInWithGoogle,
    emailCooldownSec,
  } = useAuth();

  const [mainStep, setMainStep] = useState<MainStep>("welcome");
  const [welcomeSub, setWelcomeSub] = useState(0);
  const [email, setEmail] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [pending, setPending] = useState<AuthAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [guestFailed, setGuestFailed] = useState(false);
  const welcomeRef = useRef<FlatList>(null);

  const mainIndex = MAIN_STEPS.indexOf(mainStep);
  const flowStep = mainStep === "welcome" ? welcomeSub : mainIndex + 1;
  const onPoster = mainStep === "welcome" && welcomeSub === 0;
  const reading = useReadingVeil(!onPoster);

  // The route sets gestureEnabled: false, so without this Android's back button
  // would try to pop the stack and leave the app rather than step back a screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => sub.remove();
  }, [mainStep, welcomeSub]);

  if (complete) {
    return <Redirect href="/(tabs)/home" />;
  }

  async function finish() {
    await markComplete();
    router.replace("/(tabs)/home");
  }

  /**
   * Bound to onScroll as well as onMomentumScrollEnd. A slow drag released
   * without flick produces no momentum event on iOS, so momentum alone left the
   * pager on page two while the progress track still read page one.
   */
  function onWelcomeScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width <= 0) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    const clamped = Math.max(0, Math.min(1, index));
    if (clamped !== welcomeSub) setWelcomeSub(clamped);
  }

  function goToWelcomePage(index: number) {
    setWelcomeSub(index);
    welcomeRef.current?.scrollToIndex({ index, animated: true });
  }

  function advanceWelcome() {
    if (welcomeSub === 0) {
      goToWelcomePage(1);
      return;
    }
    setMainStep("language");
  }

  /**
   * The choice already applied on tap — the whole step is a live preview. There
   * is nothing left to commit here, only somewhere to go next.
   */
  function advanceLanguage() {
    setMainStep("account");
  }

  /** Returns true when it consumed the gesture, which is what BackHandler wants. */
  function goBack() {
    if (mainStep === "account") {
      setMainStep("language");
      return true;
    }
    if (mainStep === "language") {
      setMainStep("welcome");
      setWelcomeSub(1);
      return true;
    }
    if (welcomeSub > 0) {
      goToWelcomePage(welcomeSub - 1);
      return true;
    }
    return false;
  }

  /** Drops the two intro pages. Language and account are real choices, so they stay. */
  function skipIntro() {
    setMainStep("language");
  }

  /**
   * `which` is what makes the feedback legible: a single boolean meant every
   * button on the step reported busy at once, so tapping "continue as guest"
   * also spun the Google button and nothing said which one you had started.
   */
  async function runAuth(
    which: AuthAction,
    action: () => Promise<boolean | void>,
    options: { finishAfter?: boolean } = {}
  ) {
    const { finishAfter = true } = options;
    const isGuest = which === "guest";
    if (pending) return;
    setPending(which);
    setMessage(null);
    if (!isGuest) setGuestFailed(false);
    try {
      // A provider that resolves false means the person dismissed the sheet.
      // Finishing there would mark onboarding complete and drop them into the
      // app signed out, with no way back to the other sign-in options.
      const started = await action();
      if (finishAfter && started !== false) await finish();
    } catch (e) {
      const raw = (e as Error).message || "";
      if (
        raw === "EMAIL_QUOTA" ||
        raw === "RATE_LIMITED" ||
        /rate|too many|wait a minute/i.test(raw)
      ) {
        setMessage(t("authEmailQuota"));
      } else {
        setMessage(raw);
      }
      if (isGuest) setGuestFailed(true);
    } finally {
      setPending(null);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.void }]}>
      <OnboardingBackdrop reading={reading} />
      <Screen
        atmosphere="none"
        padded={false}
        style={styles.transparent}
        edges={["top", "left", "right", "bottom"]}
      >
      <OnboardingHeader
        step={flowStep}
        total={FLOW_TOTAL}
        onBack={flowStep > 0 ? goBack : undefined}
        onSkip={mainStep === "welcome" ? skipIntro : undefined}
      />

      {mainStep === "welcome" ? (
        <View style={styles.welcomeBody}>
          <FlatList
            ref={welcomeRef}
            horizontal
            pagingEnabled
            style={styles.welcomePager}
            data={[0, 1]}
            keyExtractor={(item) => String(item)}
            showsHorizontalScrollIndicator={false}
            onScroll={onWelcomeScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onWelcomeScroll}
            // Restores the page you were on when Back brings you here from
            // language; the pager unmounts while the later steps are on screen.
            initialScrollIndex={welcomeSub}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={[styles.welcomeSlide, { width }]}>
                {item === 0 ? (
                  <OnboardingHeroSlide />
                ) : (
                  <OnboardingPathsSlide active={welcomeSub === 1} />
                )}
              </View>
            )}
          />
          <View style={styles.footer}>
            <Button label={t("onboardingContinue")} onPress={advanceWelcome} />
          </View>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {mainStep === "language" ? (
            <OnboardingLanguageStep selected={lang} onSelect={setLang} />
          ) : null}

          {mainStep === "account" ? (
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
              onGoogle={() => void runAuth("google", signInWithGoogle)}
              onEmailSubmit={() =>
                void runAuth(
                  "email",
                  async () => {
                    await signInWithEmail(email.trim());
                    setLinkSent(true);
                  },
                  { finishAfter: false }
                )
              }
              onGuest={() => void runAuth("guest", signInAnonymously)}
              onEnterAnyway={() => void finish()}
            />
          ) : null}
        </ScrollView>
      )}

      {mainStep === "language" ? (
        <View style={styles.footer}>
          <Button label={t("onboardingContinue")} onPress={advanceLanguage} />
        </View>
      ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  transparent: {
    backgroundColor: "transparent",
  },
  welcomeBody: {
    flex: 1,
  },
  welcomePager: {
    flex: 1,
  },
  /** No horizontal inset: the poster is edge-to-edge, slides pad their own copy. */
  welcomeSlide: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
