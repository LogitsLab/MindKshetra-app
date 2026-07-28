import { useEffect } from "react";
import { useRootNavigationState, useRouter, useSegments } from "expo-router";
import { useOnboarding } from "@/context/OnboardingContext";

/**
 * After the root navigator mounts, keep users on onboarding until complete.
 * Complements app/index.tsx (handles `/`) for deep links into tabs/modals.
 */
export function useOnboardingRouting() {
  const router = useRouter();
  const segments = useSegments();
  const rootState = useRootNavigationState();
  const { ready, complete } = useOnboarding();

  const navigationReady = Boolean(rootState?.key);
  const root = segments[0] as string | undefined;
  const onOnboarding = root === "onboarding";
  const onAuthCallback = root === "auth";

  useEffect(() => {
    if (!ready || !navigationReady) return;

    if (!complete && !onOnboarding && !onAuthCallback) {
      router.replace("/onboarding");
      return;
    }

    if (complete && onOnboarding) {
      router.replace("/(tabs)/home");
    }
  }, [
    ready,
    complete,
    navigationReady,
    onOnboarding,
    onAuthCallback,
    router,
  ]);
}
