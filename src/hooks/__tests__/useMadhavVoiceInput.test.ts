/**
 * Madhav voice must not touch the speech native module on mount — that path
 * native-crashes Ask Madhav on open (Android reactContext!!).
 */

const isRecognitionAvailable = jest.fn(() => true);
const addListener = jest.fn(() => ({ remove: jest.fn() }));
const requestPermissionsAsync = jest.fn(async () => ({ granted: true }));
const start = jest.fn();
const stop = jest.fn();
const abort = jest.fn();

const mockModule = {
  isRecognitionAvailable,
  addListener,
  requestPermissionsAsync,
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
}));

import { getSpeechModule } from "../useMadhavVoiceInput";

describe("getSpeechModule / deferred voice init", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads the module only when explicitly requested (not on import)", () => {
    // Importing the hook module must not call isRecognitionAvailable.
    expect(isRecognitionAvailable).not.toHaveBeenCalled();
    expect(addListener).not.toHaveBeenCalled();

    const mod = getSpeechModule();
    expect(mod).toBeTruthy();
    // Still no availability probe until ensureSpeechReady / mic press.
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
    // Behavioral lock: production code only calls isRecognitionAvailable /
    // addListener inside ensureSpeechReady (mic press), never in a mount effect.
    const src = jest.requireActual("fs").readFileSync(
      require("path").join(__dirname, "../useMadhavVoiceInput.ts"),
      "utf8"
    ) as string;
    expect(src).toMatch(/ensureSpeechReady/);
    expect(src).toMatch(/deferred until the mic/i);
    // No mount-time isRecognitionAvailable outside ensureSpeechReady.
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
