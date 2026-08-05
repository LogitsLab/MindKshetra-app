import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getOnboardingComplete,
  setOnboardingComplete,
  clearOnboardingComplete,
} from "@/storage/local";

type OnboardingContextValue = {
  ready: boolean;
  complete: boolean;
  /** Dev / settings replay — bypasses the signed-in skip until finish. */
  forceReplay: boolean;
  markComplete: () => Promise<void>;
  resetComplete: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);
  const [forceReplay, setForceReplay] = useState(false);

  useEffect(() => {
    let alive = true;
    getOnboardingComplete()
      .then((done) => {
        if (!alive) return;
        setComplete(done);
      })
      .catch(() => {
        // Unreadable storage counts as "not onboarded" — never block the app.
        if (alive) setComplete(false);
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const markComplete = useCallback(async () => {
    await setOnboardingComplete();
    setComplete(true);
    setForceReplay(false);
  }, []);

  const resetComplete = useCallback(async () => {
    await clearOnboardingComplete();
    setComplete(false);
    setForceReplay(true);
  }, []);

  const value = useMemo(
    () => ({ ready, complete, forceReplay, markComplete, resetComplete }),
    [ready, complete, forceReplay, markComplete, resetComplete]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding requires OnboardingProvider");
  return ctx;
}
