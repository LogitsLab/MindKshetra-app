import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

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

type PermissionResult = { granted: boolean };

type SpeechModule = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<PermissionResult>;
  // Newer expo-speech-recognition exposes per-scope permission requests; we
  // prefer these so mic and speech can't end up half-granted before start().
  requestMicrophonePermissionsAsync?: () => Promise<PermissionResult>;
  requestSpeechRecognizerPermissionsAsync?: () => Promise<PermissionResult>;
  getSupportedLocales?: (options: Record<string, unknown>) => Promise<{
    locales: string[];
    installedLocales: string[];
  }>;
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  addListener: (
    event: string,
    listener: (event: any) => void
  ) => { remove: () => void };
};

type SpeechSub = { remove: () => void };

/**
 * Expo Go has no ExpoSpeechRecognition native module. The package's top-level
 * `requireNativeModule(...)` throws on load — and Metro can hoist `require()`
 * out of try/catch — so probe with requireOptionalNativeModule first.
 */
export function getSpeechModule(): SpeechModule | null {
  if (Platform.OS === "web") return null;
  if (!requireOptionalNativeModule("ExpoSpeechRecognition")) {
    return null;
  }
  try {
    // Indirect require so Metro cannot hoist it above the native-module guard.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const req = require as typeof require;
    const mod = req("expo-speech-recognition") as {
      ExpoSpeechRecognitionModule: SpeechModule;
    };
    return mod.ExpoSpeechRecognitionModule ?? null;
  } catch {
    return null;
  }
}

/** Request microphone permission, falling back to the combined request. */
async function requestMicPermission(mod: SpeechModule): Promise<boolean> {
  if (typeof mod.requestMicrophonePermissionsAsync === "function") {
    const res = await mod.requestMicrophonePermissionsAsync();
    return Boolean(res?.granted);
  }
  const res = await mod.requestPermissionsAsync();
  return Boolean(res?.granted);
}

/** Request speech-recognition permission (already covered by the combined call). */
async function requestSpeechPermission(mod: SpeechModule): Promise<boolean> {
  if (typeof mod.requestSpeechRecognizerPermissionsAsync === "function") {
    const res = await mod.requestSpeechRecognizerPermissionsAsync();
    return Boolean(res?.granted);
  }
  // Combined requestPermissionsAsync (used by requestMicPermission above) grants
  // both scopes at once on older versions, so there's nothing left to ask.
  return true;
}

/**
 * After a permission prompt the system briefly owns the audio session while the
 * sheet dismisses. Grabbing it mid-transition makes AVAudioEngine throw an ObjC
 * exception on iPad — which, under the New Architecture, crashes Hermes instead
 * of surfacing as a catchable error. Wait for the app to settle back to active.
 */
async function settleAudioSession(): Promise<void> {
  if (Platform.OS !== "ios" || !AppState) return;
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    if (AppState.currentState === "active") {
      setTimeout(finish, 400);
      return;
    }
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        try {
          sub.remove();
        } catch {
          /* ignore */
        }
        setTimeout(finish, 400);
      }
    });
    // Safety net so we never hang if "active" somehow never fires.
    setTimeout(() => {
      try {
        sub.remove();
      } catch {
        /* ignore */
      }
      finish();
    }, 2000);
  });
}

/**
 * Pick a locale the recognizer actually supports. Starting with an uninstalled
 * locale (e.g. hi-IN/en-IN on a US review iPad) is another native-throw window.
 * Falls back language-family → en-US → first supported. Returns null only when
 * the device reports it supports nothing.
 */
export async function resolveLocale(
  mod: Pick<SpeechModule, "getSupportedLocales">,
  preferred: string
): Promise<string | null> {
  if (typeof mod.getSupportedLocales !== "function") return preferred;
  try {
    const { locales } = await mod.getSupportedLocales({});
    if (!locales || locales.length === 0) {
      // Some iOS versions report an empty list even when recognition works;
      // don't block the user — trust the preferred locale.
      return preferred;
    }
    const lower = locales.map((l) => l.toLowerCase());
    const has = (l: string) => lower.includes(l.toLowerCase());
    if (has(preferred)) return preferred;

    const family = preferred.split("-")[0].toLowerCase();
    const familyMatch = locales.find((l) =>
      l.toLowerCase().startsWith(`${family}-`)
    );
    if (familyMatch) return familyMatch;

    if (has("en-US")) return "en-US";
    const enMatch = locales.find((l) => l.toLowerCase().startsWith("en-"));
    if (enMatch) return enMatch;

    return locales[0] ?? null;
  } catch {
    // A failed probe must not block dictation; fall back to the preferred tag.
    return preferred;
  }
}

/**
 * On-device speech → text for Madhav (mirrors web ChatWindow STT).
 * Speech native APIs are deferred until the mic is pressed — probing on mount
 * can native-crash Android (reactContext!!) and kill Ask Madhav on open.
 */
export function useMadhavVoiceInput({
  lang,
  disabled,
  onTranscript,
  onError,
  labels,
}: Options) {
  // Optimistic for native builds so the mic is visible before first press.
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(() => Platform.OS !== "web");
  const moduleRef = useRef<SpeechModule | null>(null);
  const subsRef = useRef<SpeechSub[]>([]);
  const readyRef = useRef(false);
  const baseInputRef = useRef("");
  const wantListenRef = useRef(false);
  const listeningRef = useRef(false);
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

  // Keep a ref mirror of `listening` so callbacks can read it without becoming
  // stale or forcing re-creation on every toggle.
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  const teardownSpeech = useCallback(() => {
    wantListenRef.current = false;
    for (const sub of subsRef.current) {
      try {
        sub.remove();
      } catch {
        /* ignore */
      }
    }
    subsRef.current = [];
    try {
      moduleRef.current?.abort();
    } catch {
      /* ignore */
    }
    readyRef.current = false;
    setListening(false);
  }, []);

  useEffect(() => () => teardownSpeech(), [teardownSpeech]);

  const ensureSpeechReady = useCallback((): SpeechModule | null => {
    if (readyRef.current && moduleRef.current) {
      return moduleRef.current;
    }

    const mod = getSpeechModule();
    moduleRef.current = mod;
    if (!mod) {
      setSupported(false);
      return null;
    }

    try {
      if (!mod.isRecognitionAvailable()) {
        setSupported(false);
        return null;
      }
    } catch {
      setSupported(false);
      return null;
    }

    // Drop any previous listeners before re-attaching.
    for (const sub of subsRef.current) {
      try {
        sub.remove();
      } catch {
        /* ignore */
      }
    }

    subsRef.current = [
      mod.addListener("start", () => {
        if (wantListenRef.current) setListening(true);
      }),
      // `end` no longer re-arms start(). The old auto-restart raced a second
      // start() onto the TurboModule queue against native `continuous: true`,
      // and that void-method race is what threw the NSException that crashed
      // Hermes on iPad. Continuous mode is handled entirely natively now.
      mod.addListener("end", () => {
        wantListenRef.current = false;
        setListening(false);
      }),
      mod.addListener(
        "result",
        (event: {
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
        }
      ),
      mod.addListener("error", (event: { error?: string }) => {
        const code = event.error;
        if (code === "aborted" || code === "no-speech") return;
        wantListenRef.current = false;
        setListening(false);
        onErrorRef.current(labelsRef.current.error);
      }),
    ];

    readyRef.current = true;
    setSupported(true);
    return mod;
  }, []);

  const stopListening = useCallback(() => {
    wantListenRef.current = false;
    // Only stop an actually-active recognizer. A cold stop() (no live session)
    // emits an `end` event, which used to trigger the crash-prone restart path.
    if (listeningRef.current) {
      try {
        moduleRef.current?.stop();
      } catch {
        /* ignore */
      }
    }
    setListening(false);
  }, []);

  const startListening = useCallback(
    async (currentInput: string) => {
      if (disabled) return;

      const mod = ensureSpeechReady();
      if (!mod) {
        onErrorRef.current(labelsRef.current.unsupported);
        return;
      }

      // Never stop() on a cold start — see stopListening / the `end` listener.
      if (listeningRef.current) {
        stopListening();
      }

      // Request microphone and speech permissions separately so we can't start
      // with one scope ungranted.
      try {
        const micGranted = await requestMicPermission(mod);
        if (!micGranted) {
          onErrorRef.current(labelsRef.current.error);
          return;
        }
        const speechGranted = await requestSpeechPermission(mod);
        if (!speechGranted) {
          onErrorRef.current(labelsRef.current.error);
          return;
        }
      } catch {
        onErrorRef.current(labelsRef.current.error);
        return;
      }

      // Let the permission sheet dismiss and the OS release the audio session.
      await settleAudioSession();

      // Only start once we know the recognizer supports a concrete locale.
      const preferred = langRef.current === "hi" ? "hi-IN" : "en-IN";
      const locale = await resolveLocale(mod, preferred);
      if (!locale) {
        setSupported(false);
        onErrorRef.current(labelsRef.current.unsupported);
        return;
      }

      baseInputRef.current = currentInput.trim();
      wantListenRef.current = true;
      setListening(true);

      try {
        mod.start({
          lang: locale,
          interimResults: true,
          continuous: true,
          addsPunctuation: true,
          // Network recognition is more reliable across locales/devices than
          // requiring an installed on-device model.
          requiresOnDeviceRecognition: false,
          // Pin the audio session category explicitly (matches the library
          // default) so we don't fight expo-audio's playback session.
          iosCategory: {
            category: "playAndRecord",
            categoryOptions: ["defaultToSpeaker", "allowBluetooth"],
            mode: "measurement",
          },
        });
      } catch {
        wantListenRef.current = false;
        setListening(false);
        onErrorRef.current(labelsRef.current.error);
      }
    },
    [disabled, ensureSpeechReady, stopListening]
  );

  const toggleListening = useCallback(
    (currentInput: string) => {
      if (listeningRef.current) stopListening();
      else void startListening(currentInput);
    },
    [startListening, stopListening]
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
