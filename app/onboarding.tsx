import React, { useRef, useState } from "react";
import {
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
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { OnboardingHeroSlide } from "@/components/onboarding/OnboardingHeroSlide";
import { OnboardingPathsSlide } from "@/components/onboarding/OnboardingPathsSlide";
import { OnboardingLanguageStep } from "@/components/onboarding/OnboardingLanguageStep";
import { OnboardingAuthStep } from "@/components/onboarding/OnboardingAuthStep";
import {
  OnboardingBackdrop,
  useReadingVeil,
} from "@/components/onboarding/OnboardingBackdrop";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";
import type { AppLang } from "@/i18n/dictionary";

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
  const [draftLang, setDraftLang] = useState<AppLang>(lang);
  const [email, setEmail] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [guestFailed, setGuestFailed] = useState(false);
  const welcomeRef = useRef<FlatList>(null);

  const mainIndex = MAIN_STEPS.indexOf(mainStep);
  const flowStep = mainStep === "welcome" ? welcomeSub : mainIndex + 1;
  const onPoster = mainStep === "welcome" && welcomeSub === 0;
  const reading = useReadingVeil(!onPoster);

  if (complete) {
    return <Redirect href="/(tabs)/home" />;
  }

  async function finish() {
    await markComplete();
    router.replace("/(tabs)/home");
  }

  function onWelcomeScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setWelcomeSub(index);
  }

  function advanceWelcome() {
    if (welcomeSub === 0) {
      welcomeRef.current?.scrollToIndex({ index: 1, animated: true });
      setWelcomeSub(1);
      return;
    }
    setMainStep("language");
  }

  function advanceLanguage() {
    setLang(draftLang);
    setMainStep("account");
  }

  async function runAuth(
    action: () => Promise<void>,
    options: { finishAfter?: boolean; isGuest?: boolean } = {}
  ) {
    const { finishAfter = true, isGuest = false } = options;
    setBusy(true);
    setMessage(null);
    if (!isGuest) setGuestFailed(false);
    try {
      await action();
      if (finishAfter) await finish();
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
      setBusy(false);
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
      <View style={styles.header}>
        <OnboardingProgress step={flowStep} total={FLOW_TOTAL} />
      </View>

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
            onMomentumScrollEnd={onWelcomeScroll}
            renderItem={({ item }) => (
              <View style={[styles.welcomeSlide, { width }]}>
                {item === 0 ? <OnboardingHeroSlide /> : <OnboardingPathsSlide />}
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
            <OnboardingLanguageStep
              draftLang={draftLang}
              onSelect={(code) => {
                setDraftLang(code);
                setLang(code);
              }}
            />
          ) : null}

          {mainStep === "account" ? (
            <OnboardingAuthStep
              configured={configured}
              busy={busy}
              message={message}
              email={email}
              emailOpen={emailOpen}
              linkSent={linkSent}
              emailCooldownSec={emailCooldownSec}
              guestFailed={guestFailed}
              onEmailChange={setEmail}
              onEmailOpen={() => setEmailOpen(true)}
              onGoogle={() => void runAuth(signInWithGoogle)}
              onEmailSubmit={() =>
                void runAuth(
                  async () => {
                    await signInWithEmail(email.trim());
                    setLinkSent(true);
                  },
                  { finishAfter: false }
                )
              }
              onGuest={() => void runAuth(signInAnonymously, { isGuest: true })}
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
  header: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
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
    paddingBottom: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
