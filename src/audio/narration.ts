import * as Speech from "expo-speech";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { resolveSpeechUrl } from "@/audio/manifest";

/**
 * Narration = pre-generated studio audio when the manifest has it, device TTS
 * otherwise. One session at a time — async gaps must not spawn orphan players.
 */
let player: AudioPlayer | null = null;
let audioModeSet = false;
/** Bumped on every stop / new play so in-flight awaits can abort. */
let session = 0;

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
  session += 1;
  Speech.stop();
  if (player) {
    try {
      player.removeAllListeners("playbackStatusUpdate");
      try {
        player.pause();
      } catch {
        /* ignore */
      }
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

export type PlayUrlOptions = {
  rate?: number;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: () => void;
};

/**
 * Warm the HTTP/edge cache for a recitation URL without playing.
 * Fire-and-forget — safe to call from SpeakButton mount.
 */
export function prefetchAudioUrl(url: string | null | undefined): void {
  if (!url) return;
  void fetch(url, { method: "GET", headers: { Range: "bytes=0-1" } }).catch(
    () => undefined
  );
}

async function ensureAudioMode(): Promise<void> {
  if (audioModeSet) return;
  audioModeSet = true;
  await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
}

/** Play a remote (or local) file. Call play() immediately — waiting on isLoaded races with Expo remounts. */
async function playLoaded(
  url: string,
  options: PlayUrlOptions,
  mySession: number
): Promise<boolean> {
  await ensureAudioMode();
  if (mySession !== session) {
    options.onStopped?.();
    return false;
  }

  const p = createAudioPlayer({ uri: url });
  player = p;

  let finished = false;
  p.addListener("playbackStatusUpdate", (status) => {
    if (mySession !== session) return;
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
  return true;
}

/** Play a single audio file with no TTS fallback (Sanskrit recitation). */
export async function playUrl(
  url: string,
  options: PlayUrlOptions = {}
): Promise<boolean> {
  stopNarration();
  const mySession = session;
  try {
    return await playLoaded(url, options, mySession);
  } catch {
    if (mySession === session) {
      options.onError?.();
    }
    return false;
  }
}

export async function playOrSpeak(
  text: string,
  options: NarrationOptions
): Promise<boolean> {
  stopNarration();
  const mySession = session;

  let url = options.url ?? null;
  if (!url) {
    try {
      url = await resolveSpeechUrl(text, options.lang);
    } catch {
      url = null;
    }
  }

  // A newer play/stop won while we were resolving audio.
  if (mySession !== session) {
    options.onStopped?.();
    return false;
  }

  if (!url) {
    speakFallback(text, options);
    return true;
  }

  try {
    return await playLoaded(url, options, mySession);
  } catch {
    if (mySession !== session) {
      options.onStopped?.();
      return false;
    }
    stopNarration();
    speakFallback(text, options);
    return true;
  }
}
