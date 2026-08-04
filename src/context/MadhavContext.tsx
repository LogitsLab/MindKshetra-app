import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type MadhavContextValue = {
  pendingPrompt: string | null;
  contextLabel: string | null;
  memberId: string | null;
  chartSessionId: string | null;
  birthPayload: Record<string, unknown> | null;
  slokaId: number | null;
  setVerseContext: (slokaId: number | null) => void;
  setChartSession: (id: string | null, birth?: Record<string, unknown> | null) => void;
  ask: (prompt: string) => void;
  askAboutVerse: (slokaId: number, prompt?: string) => void;
  askAboutChart: (memberId: string, prompt?: string) => void;
  clearPending: () => void;
  streaming: boolean;
  setStreaming: (v: boolean) => void;
};

const MadhavContext = createContext<MadhavContextValue | null>(null);

export function MadhavProvider({ children }: { children: React.ReactNode }) {
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [contextLabel, setContextLabel] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [chartSessionId, setChartSessionId] = useState<string | null>(null);
  const [birthPayload, setBirthPayload] = useState<Record<string, unknown> | null>(
    null
  );
  const [slokaId, setSlokaId] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);

  const clearPending = useCallback(() => {
    setPendingPrompt(null);
    setContextLabel(null);
  }, []);

  const setVerseContext = useCallback((id: number | null) => {
    setSlokaId(id);
    if (id != null) {
      setMemberId(null);
      setChartSessionId(null);
      setBirthPayload(null);
      setContextLabel(`Verse ${id}`);
    }
  }, []);

  const setChartSession = useCallback(
    (id: string | null, birth?: Record<string, unknown> | null) => {
      setChartSessionId(id);
      setMemberId(null);
      setSlokaId(null);
      setBirthPayload(birth ?? null);
      if (id) setContextLabel("Session chart");
    },
    []
  );

  const ask = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
    setContextLabel((prev) => prev ?? "Madhav");
  }, []);

  const askAboutVerse = useCallback((id: number, prompt?: string) => {
    setSlokaId(id);
    setMemberId(null);
    setChartSessionId(null);
    setBirthPayload(null);
    setContextLabel(`Verse ${id}`);
    setPendingPrompt(prompt ?? `Please reflect on verse id ${id} from the Gita.`);
  }, []);

  const askAboutChart = useCallback((id: string, prompt?: string) => {
    setMemberId(id);
    setChartSessionId(null);
    setBirthPayload(null);
    setSlokaId(null);
    setContextLabel("Birth chart");
    setPendingPrompt(
      prompt ?? "What does my chart suggest I should reflect on today?"
    );
  }, []);

  const value = useMemo(
    () => ({
      pendingPrompt,
      contextLabel,
      memberId,
      chartSessionId,
      birthPayload,
      slokaId,
      setVerseContext,
      setChartSession,
      ask,
      askAboutVerse,
      askAboutChart,
      clearPending,
      streaming,
      setStreaming,
    }),
    [
      pendingPrompt,
      contextLabel,
      memberId,
      chartSessionId,
      birthPayload,
      slokaId,
      setVerseContext,
      setChartSession,
      ask,
      askAboutVerse,
      askAboutChart,
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
