import { useCallback, useEffect, useRef, useState } from "react";
import { astrologyApi, PredictionsError } from "@/api/endpoints";
import type { AppLang } from "@/i18n/dictionary";
import type { PredictionsText } from "@/types/astrology";

export type PredictionsStage = "reading" | "composing" | "relink" | null;

export type PredictionsErrorKind =
  | "rate-limited"
  | "server"
  | "network"
  | "not-found"
  | null;

export type PredictionsRequest = {
  /** Server-minted only — never generated on the client. */
  chartSessionId?: string;
  memberId?: string;
  /** Stored birth payload; enables auto-recovery when a session 404s. */
  birth?: Record<string, unknown> | null;
};

const COMPOSING_AFTER_MS = 4000;
const DEFAULT_RETRY_AFTER_SEC = 30;

/** Honest UX copy mapping for a failed predictions call. */
export function classifyPredictionsFailure(e: unknown): {
  kind: Exclude<PredictionsErrorKind, null>;
  retryAfterSec: number | null;
} {
  if (e instanceof PredictionsError) {
    if (e.status === 429) {
      return {
        kind: "rate-limited",
        retryAfterSec: e.retryAfterSec ?? DEFAULT_RETRY_AFTER_SEC,
      };
    }
    if (e.status === 404) return { kind: "not-found", retryAfterSec: null };
    return { kind: "server", retryAfterSec: null };
  }
  return { kind: "network", retryAfterSec: null };
}

/**
 * Predictions loading with honest latency UX. Owns:
 * - staged copy while the model writes ("reading" → "composing"),
 * - errorKind mapping (429 countdown from Retry-After, 404 auto re-send of
 *   the stored birth, 5xx → retry affordance),
 * - a per-language cache so EN↔HI switching never overwrites the other
 *   language's reading,
 * - cancellation via AbortController.
 *
 * Screens prefetch by calling load() right after compute succeeds, so the
 * predictions tab is already warm when opened.
 */
export function usePredictions(opts: {
  language: AppLang;
  getRequest: () => PredictionsRequest | null;
  /** Predictions responses can carry a refreshed chart; screens adopt it. */
  onChart?: (chart: Record<string, unknown>) => void;
}) {
  const { language } = opts;
  const getRequestRef = useRef(opts.getRequest);
  getRequestRef.current = opts.getRequest;
  const onChartRef = useRef(opts.onChart);
  onChartRef.current = opts.onChart;

  const [byLang, setByLang] = useState<
    Partial<Record<AppLang, PredictionsText>>
  >({});
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<PredictionsStage>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<PredictionsErrorKind>(null);
  const [retryAfterSec, setRetryAfterSec] = useState<number | null>(null);

  const runIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (stageTimerRef.current) {
      clearTimeout(stageTimerRef.current);
      stageTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    runIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    clearTimers();
    setBusy(false);
    setStage(null);
  }, [clearTimers]);

  useEffect(
    () => () => {
      runIdRef.current += 1;
      abortRef.current?.abort();
      clearTimers();
    },
    [clearTimers]
  );

  const startCountdown = useCallback(() => {
    countdownRef.current = setInterval(() => {
      setRetryAfterSec((prev) => {
        if (prev == null || prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const load = useCallback(
    async (force = false) => {
      const req = getRequestRef.current();
      if (!req || (!req.chartSessionId && !req.memberId && !req.birth)) return;

      const runId = ++runIdRef.current;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      clearTimers();
      setBusy(true);
      setError(null);
      setErrorKind(null);
      setRetryAfterSec(null);
      setStage("reading");
      stageTimerRef.current = setTimeout(() => {
        if (runIdRef.current === runId) setStage("composing");
      }, COMPOSING_AFTER_MS);

      try {
        let res: Awaited<ReturnType<typeof astrologyApi.predictionsDetailed>>;
        try {
          res = await astrologyApi.predictionsDetailed(
            {
              ...(req.chartSessionId ? { chartSessionId: req.chartSessionId } : {}),
              ...(req.memberId ? { memberId: req.memberId } : {}),
              ...(req.birth && !req.memberId ? { birth: req.birth } : {}),
              language,
              force,
            },
            ac.signal
          );
        } catch (e) {
          // A 404 on an expired chart session is recoverable when the birth
          // payload is still stored: re-send it so the server mints a fresh
          // session, instead of surfacing a dead-end error.
          const recoverable =
            e instanceof PredictionsError &&
            e.status === 404 &&
            req.birth != null &&
            (e.recoverable || Boolean(req.chartSessionId));
          if (!recoverable) throw e;
          if (runIdRef.current !== runId) return;
          setStage("relink");
          res = await astrologyApi.predictionsDetailed(
            { birth: req.birth, language, force },
            ac.signal
          );
        }
        if (runIdRef.current !== runId) return;
        if (res.chart) onChartRef.current?.(res.chart);
        if (res.predictionsText) {
          const text = res.predictionsText;
          setByLang((prev) => ({ ...prev, [language]: text }));
        }
      } catch (e) {
        if (runIdRef.current !== runId) return;
        if ((e as Error)?.name === "AbortError") return;
        const { kind, retryAfterSec: sec } = classifyPredictionsFailure(e);
        setErrorKind(kind);
        setError((e as Error)?.message || kind);
        if (kind === "rate-limited") {
          setRetryAfterSec(sec);
          startCountdown();
        }
      } finally {
        if (runIdRef.current === runId) {
          if (stageTimerRef.current) {
            clearTimeout(stageTimerRef.current);
            stageTimerRef.current = null;
          }
          setBusy(false);
          setStage(null);
        }
      }
    },
    [language, clearTimers, startCountdown]
  );

  /** Adopt an already-generated reading (e.g. stored on a saved chart). */
  const seed = useCallback((lang: AppLang, text: PredictionsText) => {
    setByLang((prev) => (prev[lang] ? prev : { ...prev, [lang]: text }));
  }, []);

  /** Forget everything — the form is about to cast a different person. */
  const reset = useCallback(() => {
    cancel();
    setByLang({});
    setError(null);
    setErrorKind(null);
    setRetryAfterSec(null);
  }, [cancel]);

  return {
    predictions: byLang[language] ?? null,
    busy,
    stage,
    error,
    errorKind,
    retryAfterSec,
    load,
    cancel,
    seed,
    reset,
  };
}
