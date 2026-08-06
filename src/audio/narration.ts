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
/** Active UI callback — notified when something else stops playback. */
let activeStopped: (() => void) | null = null;

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

function clearActiveCallbacks(): void {
  activeStopped = null;
}

function bindActiveCallbacks(options: { onStopped?: () => void }): void {
  activeStopped = options.onStopped ?? null;
}

/** Current narration session id (for ownership checks in UI). */
export function getNarrationSession(): number {
  return session;
}

/**
 * Stop global narration. Notifies the previous owner's onStopped so UI cannot
 * stay stuck on "Stop" when another SpeakButton (or navigation) ends playback.
 */
export function stopNarration(): void {
  session += 1;
  const prevStopped = activeStopped;
  clearActiveCallbacks();
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
  prevStopped?.();
}

/** Stop only if `ownerSession` still owns the global player. */
export function stopNarrationIfOwner(ownerSession: number): void {
  if (ownerSession === session) {
    stopNarration();
  }
}

function speakFallback(text: string, options: NarrationOptions): void {
  bindActiveCallbacks(options);
  Speech.speak(text, {
    language: options.lang === "hi" ? "hi-IN" : "en-IN",
    rate: options.rate,
    onStart: options.onStart,
    onDone: () => {
      clearActiveCallbacks();
      options.onDone?.();
    },
    onStopped: () => {
      clearActiveCallbacks();
      options.onStopped?.();
    },
    onError: () => {
      clearActiveCallbacks();
      options.onError?.();
    },
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
  bindActiveCallbacks(options);

  let finished = false;
  p.addListener("playbackStatusUpdate", (status) => {
    if (mySession !== session) return;
    if ("isLoaded" in status && status.isLoaded === false) {
      const err =
        "error" in status && status.error ? String(status.error) : null;
      if (err) {
        finished = true;
        clearActiveCallbacks();
        try {
          p.removeAllListeners("playbackStatusUpdate");
          p.remove();
        } catch {
          /* ignore */
        }
        if (player === p) player = null;
        options.onError?.();
        return;
      }
    }
    if (status.didJustFinish && !finished) {
      finished = true;
      clearActiveCallbacks();
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
      clearActiveCallbacks();
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
