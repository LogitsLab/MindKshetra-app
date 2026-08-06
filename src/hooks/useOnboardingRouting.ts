import { useEffect } from "react";
import { useRootNavigationState, useRouter, useSegments } from "expo-router";
import { useOnboarding } from "@/context/OnboardingContext";
import { useOnboardingDone } from "@/hooks/useOnboardingDone";

/**
 * After the root navigator mounts, keep guests and first-time users on
 * onboarding until complete. A signed-in account counts as done — a restored
 * session must never be walked through onboarding, even when the local flag
 * is missing (fresh install) or stale (version bump).
 * Complements app/index.tsx (handles `/`) for deep links into tabs/modals.
 */
export function useOnboardingRouting() {
  const router = useRouter();
  const segments = useSegments();
  const rootState = useRootNavigationState();
  const { markComplete } = useOnboarding();
  const { ready, authLoading, done, complete, forceReplay, isSignedIn } =
    useOnboardingDone();

  const navigationReady = Boolean(rootState?.key);
  const root = segments[0] as string | undefined;
  const onOnboarding = root === "onboarding";
  const onAuthCallback = root === "auth";

  // Heal a missing local flag after account restore / interrupted finish().
  useEffect(() => {
    if (!ready || authLoading || forceReplay) return;
    if (isSignedIn && !complete) {
      void markComplete();
    }
  }, [ready, authLoading, forceReplay, isSignedIn, complete, markComplete]);

  useEffect(() => {
    if (!ready || authLoading || !navigationReady) return;

    if (!done && !onOnboarding && !onAuthCallback) {
      router.replace("/onboarding");
      return;
    }

    if (done && onOnboarding) {
      router.replace("/(tabs)/home");
    }
  }, [
    ready,
    authLoading,
    done,
    navigationReady,
    onOnboarding,
    onAuthCallback,
    router,
  ]);
}
