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
  markComplete: () => Promise<void>;
  resetComplete: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);

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
  }, []);

  const resetComplete = useCallback(async () => {
    await clearOnboardingComplete();
    setComplete(false);
  }, []);

  const value = useMemo(
    () => ({ ready, complete, markComplete, resetComplete }),
    [ready, complete, markComplete, resetComplete]
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
