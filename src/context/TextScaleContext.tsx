import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getStoredTextScale, setStoredTextScale } from "@/storage/local";

export type TextScaleId = "sm" | "md" | "lg";

const MULTIPLIERS: Record<TextScaleId, number> = {
  sm: 0.9,
  md: 1,
  lg: 1.18,
};

type TextScaleContextValue = {
  scale: TextScaleId;
  multiplier: number;
  setScale: (scale: TextScaleId) => void;
};

const TextScaleContext = createContext<TextScaleContextValue | null>(null);

export function TextScaleProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScaleState] = useState<TextScaleId>("md");

  useEffect(() => {
    getStoredTextScale().then((stored) => {
      if (stored) setScaleState(stored);
    });
  }, []);

  const setScale = useCallback((next: TextScaleId) => {
    setScaleState(next);
    void setStoredTextScale(next);
  }, []);

  const value = useMemo(
    () => ({
      scale,
      multiplier: MULTIPLIERS[scale],
      setScale,
    }),
    [scale, setScale]
  );

  return (
    <TextScaleContext.Provider value={value}>{children}</TextScaleContext.Provider>
  );
}

export function useTextScale() {
  const ctx = useContext(TextScaleContext);
  if (!ctx) throw new Error("useTextScale requires TextScaleProvider");
  return ctx;
}
