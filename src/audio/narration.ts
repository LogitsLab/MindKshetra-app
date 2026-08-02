import * as Speech from "expo-speech";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { resolveSpeechUrl } from "@/audio/manifest";

/**
 * Narration = pre-generated studio audio when the manifest has it, device TTS
 * otherwise. Mirrors the expo-speech callback contract so call sites swap
 * one function name. One player at a time — starting narration stops any
 * previous one, like Speech.speak does.
 */
let player: AudioPlayer | null = null;
let audioModeSet = false;

export type NarrationOptions = {
  lang: "en" | "hi";
  rate?: number;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: () => void;
  /** Explicit file to prefer over the text-hash lookup (e.g. recitation). */
  url?: string | null;
};

export function stopNarration(): void {
  Speech.stop();
  if (player) {
    try {
      player.removeAllListeners("playbackStatusUpdate");
      player.remove();
    } catch {
      /* already released */
    }
    player = null;
  }
}

function speakFallback(text: string, options: NarrationOptions): void {
  Speech.speak(text, {
    language: options.lang === "hi" ? "hi-IN" : "en-IN",
    rate: options.rate,
    onStart: options.onStart,
    onDone: options.onDone,
    onStopped: options.onStopped,
    onError: options.onError,
  });
}

export async function playOrSpeak(
  text: string,
  options: NarrationOptions
): Promise<void> {
  stopNarration();

  let url = options.url ?? null;
  if (!url) {
    try {
      url = await resolveSpeechUrl(text, options.lang);
    } catch {
      url = null;
    }
  }

  if (!url) {
    speakFallback(text, options);
    return;
  }

  try {
    if (!audioModeSet) {
      audioModeSet = true;
      // Meditation must be audible with the iOS silent switch on.
      await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    }
    const p = createAudioPlayer({ uri: url });
    player = p;
    let finished = false;
    p.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish && !finished) {
        finished = true;
        options.onDone?.();
      }
    });
    if (options.rate && options.rate !== 1) {
      p.setPlaybackRate(options.rate, "high");
    }
    p.play();
    options.onStart?.();
  } catch {
    // Network/decoder failure — degrade to TTS rather than silence.
    stopNarration();
    speakFallback(text, options);
  }
}
