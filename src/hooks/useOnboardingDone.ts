import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";

/**
 * Single source of truth for "may leave onboarding".
 * Signed-in accounts skip the local flag — a restored session must never be
 * bounced between home and onboarding when AsyncStorage is empty or stale.
 */
export function useOnboardingDone() {
  const { ready, complete, forceReplay } = useOnboarding();
  const { loading: authLoading, isSignedIn } = useAuth();
  const done = forceReplay ? false : complete || isSignedIn;
  return { ready, authLoading, done, complete, forceReplay, isSignedIn };
}
