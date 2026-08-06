import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

type Options = {
  lang: "en" | "hi";
  disabled?: boolean;
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
  labels: {
    unsupported: string;
    error: string;
  };
};

type SpeechModule = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  addListener: (
    event: string,
    listener: (event: any) => void
  ) => { remove: () => void };
};

/**
 * Lazy-load so Expo Go (no native module) does not crash on import.
 * Voice works in a dev/production build that includes expo-speech-recognition.
 */
function getSpeechModule(): SpeechModule | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-speech-recognition") as {
      ExpoSpeechRecognitionModule: SpeechModule;
    };
    return mod.ExpoSpeechRecognitionModule ?? null;
  } catch {
    return null;
  }
}

/**
 * On-device speech → text for Madhav (mirrors web ChatWindow STT).
 * Expo Go: unsupported (no native module). Dev/prod native builds: enabled.
 */
export function useMadhavVoiceInput({
  lang,
  disabled,
  onTranscript,
  onError,
  labels,
}: Options) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const moduleRef = useRef<SpeechModule | null>(null);
  const baseInputRef = useRef("");
  const wantListenRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const labelsRef = useRef(labels);
  const langRef = useRef(lang);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    labelsRef.current = labels;
    langRef.current = lang;
  }, [onTranscript, onError, labels, lang]);

  useEffect(() => {
    const mod = getSpeechModule();
    moduleRef.current = mod;
    if (!mod) {
      setSupported(false);
      return;
    }
    try {
      setSupported(Boolean(mod.isRecognitionAvailable()));
    } catch {
      setSupported(false);
    }

    const subs = [
      mod.addListener("start", () => {
        if (wantListenRef.current) setListening(true);
      }),
      mod.addListener("end", () => {
        if (wantListenRef.current) {
          try {
            mod.start({
              lang: langRef.current === "hi" ? "hi-IN" : "en-IN",
              interimResults: true,
              continuous: true,
              addsPunctuation: true,
            });
            return;
          } catch {
            wantListenRef.current = false;
          }
        }
        setListening(false);
      }),
      mod.addListener("result", (event: {
        isFinal?: boolean;
        results?: Array<{ transcript?: string }>;
      }) => {
        const transcript = (event.results?.[0]?.transcript ?? "").trim();
        if (!transcript) return;

        const next = [baseInputRef.current, transcript]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (event.isFinal) {
          baseInputRef.current = next;
        }
        onTranscriptRef.current(next);
      }),
      mod.addListener("error", (event: { error?: string }) => {
        const code = event.error;
        if (code === "aborted" || code === "no-speech") return;
        wantListenRef.current = false;
        setListening(false);
        onErrorRef.current(labelsRef.current.error);
      }),
    ];

    return () => {
      wantListenRef.current = false;
      for (const sub of subs) {
        try {
          sub.remove();
        } catch {
          /* ignore */
        }
      }
      try {
        mod.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    wantListenRef.current = false;
    try {
      moduleRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const startListening = useCallback(
    async (currentInput: string) => {
      if (disabled) return;
      const mod = moduleRef.current;
      if (!mod || !supported) {
        onErrorRef.current(labelsRef.current.unsupported);
        return;
      }

      stopListening();

      try {
        const permission = await mod.requestPermissionsAsync();
        if (!permission.granted) {
          onErrorRef.current(labelsRef.current.error);
          return;
        }
      } catch {
        onErrorRef.current(labelsRef.current.error);
        return;
      }

      baseInputRef.current = currentInput.trim();
      wantListenRef.current = true;
      setListening(true);

      try {
        mod.start({
          lang: lang === "hi" ? "hi-IN" : "en-IN",
          interimResults: true,
          continuous: true,
          addsPunctuation: true,
        });
      } catch {
        wantListenRef.current = false;
        setListening(false);
        onErrorRef.current(labelsRef.current.error);
      }
    },
    [disabled, lang, stopListening, supported]
  );

  const toggleListening = useCallback(
    (currentInput: string) => {
      if (listening) stopListening();
      else void startListening(currentInput);
    },
    [listening, startListening, stopListening]
  );

  const syncBaseInput = useCallback((value: string) => {
    if (!wantListenRef.current) {
      baseInputRef.current = value;
    }
  }, []);

  return {
    listening,
    supported: supported && Platform.OS !== "web",
    toggleListening,
    stopListening,
    syncBaseInput,
  };
}
