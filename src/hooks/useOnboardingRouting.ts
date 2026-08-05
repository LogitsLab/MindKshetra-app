import { useEffect } from "react";
import { useRootNavigationState, useRouter, useSegments } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";

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
  const { ready, complete, forceReplay } = useOnboarding();
  const { loading: authLoading, isSignedIn } = useAuth();

  const navigationReady = Boolean(rootState?.key);
  const root = segments[0] as string | undefined;
  const onOnboarding = root === "onboarding";
  const onAuthCallback = root === "auth";
  const done = forceReplay ? false : complete || isSignedIn;

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
