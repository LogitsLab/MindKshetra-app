/**
 * Madhav voice must not touch the speech native module on mount — that path
 * native-crashes Ask Madhav on open (Android reactContext!!).
 *
 * The start path is also crash-sensitive on iPad: a void TurboModule method
 * throwing an NSException kills Hermes under the New Architecture and cannot be
 * caught in JS. These tests lock the behaviors that keep that from happening:
 * no cold-start stop(), no auto-restart from `end`, permission gating, and
 * locale resolution before start().
 */

const listeners: Record<string, Array<(event: any) => void>> = {};

const isRecognitionAvailable = jest.fn(() => true);
const addListener = jest.fn((event: string, cb: (event: any) => void) => {
  (listeners[event] ??= []).push(cb);
  return { remove: jest.fn() };
});
const requestPermissionsAsync = jest.fn(async () => ({ granted: true }));
const requestMicrophonePermissionsAsync = jest.fn(async () => ({
  granted: true,
}));
const requestSpeechRecognizerPermissionsAsync = jest.fn(async () => ({
  granted: true,
}));
const getSupportedLocales = jest.fn(async () => ({
  locales: ["en-US", "en-GB", "hi-IN"],
  installedLocales: [],
}));
const start = jest.fn();
const stop = jest.fn();
const abort = jest.fn();

const mockModule = {
  isRecognitionAvailable,
  addListener,
  requestPermissionsAsync,
  requestMicrophonePermissionsAsync,
  requestSpeechRecognizerPermissionsAsync,
  getSupportedLocales,
  start,
  stop,
  abort,
};

jest.mock("expo-modules-core", () => ({
  requireOptionalNativeModule: jest.fn(() => ({})),
}));

jest.mock("expo-speech-recognition", () => ({
  ExpoSpeechRecognitionModule: mockModule,
}));

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  AppState: {
    currentState: "active",
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import {
  getSpeechModule,
  resolveLocale,
  useMadhavVoiceInput,
} from "../useMadhavVoiceInput";

function resetSpeechMocks() {
  jest.clearAllMocks();
  for (const key of Object.keys(listeners)) delete listeners[key];
  isRecognitionAvailable.mockReturnValue(true);
  requestMicrophonePermissionsAsync.mockResolvedValue({ granted: true });
  requestSpeechRecognizerPermissionsAsync.mockResolvedValue({ granted: true });
  getSupportedLocales.mockResolvedValue({
    locales: ["en-US", "en-GB", "hi-IN"],
    installedLocales: [],
  });
}

type HookApi = ReturnType<typeof useMadhavVoiceInput>;

function renderVoice(overrides: Partial<Parameters<typeof useMadhavVoiceInput>[0]> = {}) {
  const api = { current: null as HookApi | null };
  function Probe() {
    api.current = useMadhavVoiceInput({
      lang: "en",
      onTranscript: jest.fn(),
      onError: jest.fn(),
      labels: { unsupported: "unsupported", error: "error" },
      ...overrides,
    });
    return null;
  }
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(React.createElement(Probe));
  });
  return { api, tree };
}

/** Fire toggleListening and let the async start path (permissions + ~400ms
 *  audio-session settle + locale probe) run to completion. */
async function pressMic(api: { current: HookApi | null }, input = "") {
  await act(async () => {
    api.current?.toggleListening(input);
    await new Promise((r) => setTimeout(r, 600));
  });
}

describe("getSpeechModule / deferred voice init", () => {
  beforeEach(resetSpeechMocks);

  it("loads the module only when explicitly requested (not on import)", () => {
    expect(isRecognitionAvailable).not.toHaveBeenCalled();
    expect(addListener).not.toHaveBeenCalled();

    const mod = getSpeechModule();
    expect(mod).toBeTruthy();
    expect(isRecognitionAvailable).not.toHaveBeenCalled();
  });

  it("returns null when the optional native module is missing (Expo Go)", () => {
    const { requireOptionalNativeModule } = jest.requireMock(
      "expo-modules-core"
    ) as { requireOptionalNativeModule: jest.Mock };
    requireOptionalNativeModule.mockReturnValueOnce(null);
    expect(getSpeechModule()).toBeNull();
  });
});

describe("deferred speech contract", () => {
  it("documents that mount must not probe or register listeners", () => {
    const src = jest.requireActual("fs").readFileSync(
      require("path").join(__dirname, "../useMadhavVoiceInput.ts"),
      "utf8"
    ) as string;
    expect(src).toMatch(/ensureSpeechReady/);
    expect(src).toMatch(/deferred until the mic/i);
    const mountEffects = src.match(
      /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?\}, \[\]\)/g
    );
    if (mountEffects) {
      for (const block of mountEffects) {
        expect(block).not.toMatch(/isRecognitionAvailable/);
        expect(block).not.toMatch(/addListener/);
      }
    }
  });
});

describe("resolveLocale", () => {
  const mod = (locales: string[]) => ({
    getSupportedLocales: jest.fn(async () => ({
      locales,
      installedLocales: [],
    })),
  });

  it("keeps the preferred locale when installed", async () => {
    expect(await resolveLocale(mod(["en-US", "hi-IN"]), "hi-IN")).toBe("hi-IN");
  });

  it("falls back within the language family before English", async () => {
    expect(await resolveLocale(mod(["hi-Latn-IN", "en-US"]), "hi-IN")).toBe(
      "hi-Latn-IN"
    );
  });

  it("falls back to en-US when the preferred locale is missing", async () => {
    expect(await resolveLocale(mod(["en-US", "fr-FR"]), "hi-IN")).toBe("en-US");
  });

  it("trusts the preferred tag when the device reports no locales", async () => {
    expect(await resolveLocale(mod([]), "en-IN")).toBe("en-IN");
  });

  it("does not block on a probe failure", async () => {
    const throwing = {
      getSupportedLocales: jest.fn(async () => {
        throw new Error("error_1");
      }),
    };
    expect(await resolveLocale(throwing, "en-IN")).toBe("en-IN");
  });
});

describe("start path (crash-critical)", () => {
  beforeEach(resetSpeechMocks);

  it("does not call stop() on a cold start", async () => {
    const { api } = renderVoice();
    await pressMic(api, "hello");
    expect(stop).not.toHaveBeenCalled();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("resolves a supported locale before starting (en-IN -> en-US)", async () => {
    getSupportedLocales.mockResolvedValue({
      locales: ["en-US", "fr-FR"],
      installedLocales: [],
    });
    const { api } = renderVoice({ lang: "en" });
    await pressMic(api);
    expect(start).toHaveBeenCalledTimes(1);
    expect(start.mock.calls[0][0]).toMatchObject({ lang: "en-US" });
  });

  it("never re-arms start() from the `end` event (no restart race)", async () => {
    const { api } = renderVoice();
    await pressMic(api);
    expect(start).toHaveBeenCalledTimes(1);

    // Simulate the native session ending; the old code called start() again.
    act(() => {
      for (const cb of listeners.end ?? []) cb({});
    });
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("does not start when microphone permission is denied", async () => {
    requestMicrophonePermissionsAsync.mockResolvedValue({ granted: false });
    const onError = jest.fn();
    const { api } = renderVoice({ onError });
    await pressMic(api);
    expect(start).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith("error");
  });

  it("does not start when speech-recognition permission is denied", async () => {
    requestSpeechRecognizerPermissionsAsync.mockResolvedValue({
      granted: false,
    });
    const { api } = renderVoice();
    await pressMic(api);
    expect(start).not.toHaveBeenCalled();
  });

  it("disables the mic and never starts when recognition is unavailable", async () => {
    isRecognitionAvailable.mockReturnValue(false);
    const onError = jest.fn();
    const { api } = renderVoice({ onError });
    await pressMic(api);
    expect(start).not.toHaveBeenCalled();
    expect(api.current?.supported).toBe(false);
    expect(onError).toHaveBeenCalledWith("unsupported");
  });
});
