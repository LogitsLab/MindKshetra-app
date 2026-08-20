import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type MadhavContextValue = {
  pendingPrompt: string | null;
  contextLabel: string | null;
  slokaId: number | null;
  setVerseContext: (slokaId: number | null) => void;
  ask: (prompt: string) => void;
  askAboutVerse: (slokaId: number, prompt?: string) => void;
  clearPending: () => void;
  streaming: boolean;
  setStreaming: (v: boolean) => void;
};

const MadhavContext = createContext<MadhavContextValue | null>(null);

export function MadhavProvider({ children }: { children: React.ReactNode }) {
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [contextLabel, setContextLabel] = useState<string | null>(null);
  const [slokaId, setSlokaId] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);

  const clearPending = useCallback(() => {
    setPendingPrompt(null);
    setContextLabel(null);
  }, []);

  const setVerseContext = useCallback((id: number | null) => {
    setSlokaId(id);
    if (id != null) setContextLabel(`Verse ${id}`);
  }, []);

  const ask = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
    setContextLabel((prev) => prev ?? "Madhav");
  }, []);

  const askAboutVerse = useCallback((id: number, prompt?: string) => {
    setSlokaId(id);
    setContextLabel(`Verse ${id}`);
    setPendingPrompt(prompt ?? `Please reflect on verse id ${id} from the Gita.`);
  }, []);

  const value = useMemo(
    () => ({
      pendingPrompt,
      contextLabel,
      slokaId,
      setVerseContext,
      ask,
      askAboutVerse,
      clearPending,
      streaming,
      setStreaming,
    }),
    [
      pendingPrompt,
      contextLabel,
      slokaId,
      setVerseContext,
      ask,
      askAboutVerse,
      clearPending,
      streaming,
    ]
  );

  return <MadhavContext.Provider value={value}>{children}</MadhavContext.Provider>;
}

export function useMadhav() {
  const ctx = useContext(MadhavContext);
  if (!ctx) throw new Error("useMadhav requires MadhavProvider");
  return ctx;
}
