import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { localAudioUri } from "@/audio/cache";
import { resolveSpeechUrl } from "@/audio/manifest";

/**
 * Narration = pre-generated / recorded audio when the manifest has it, and
 * silence otherwise. There is NO device text-to-speech: the app only ever
 * plays real recordings (recitation, japa chants, ambient beds, bells, and —
 * where a voice pack exists — preloaded narration). One session at a time;
 * async gaps must not spawn orphan players.
 *
 * Sanskrit recitation uses `playUrl` (file only). Never synthesize Devanagari.
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

export type PlayUrlOptions = {
  rate?: number;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: () => void;
};

/**
 * Warm disk cache for a recitation URL without playing.
 * Fire-and-forget — safe to call from SpeakButton mount.
 */
export function prefetchAudioUrl(url: string | null | undefined): void {
  if (!url) return;
  void localAudioUri(url).catch(() => undefined);
}

async function ensureAudioMode(): Promise<void> {
  if (audioModeSet) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      shouldPlayInBackground: false,
      allowsRecording: false,
    });
    audioModeSet = true;
  } catch {
    audioModeSet = false;
  }
}

/**
 * Play a local (preferred) or remote file. Do not wait on isLoaded — that
 * gate raced Expo remounts and was reverted. Disk-cache first so play() is
 * against a local URI instead of a cold HTTP stream.
 */
async function playLoaded(
  url: string,
  options: PlayUrlOptions,
  mySession: number
): Promise<boolean> {
  const local = await localAudioUri(url);
  if (mySession !== session) {
    options.onStopped?.();
    return false;
  }

  await ensureAudioMode();
  if (mySession !== session) {
    options.onStopped?.();
    return false;
  }

  const playUri = local ?? url;
  const p = createAudioPlayer({ uri: playUri });
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

/**
 * Play preloaded narration for `text` IF the manifest (or an explicit
 * `options.url`) has a recording for it. There is no synthetic-voice fallback:
 * when no recording exists this resolves `false` and plays nothing, so callers
 * can fall back to a silent, music-led experience. Returns `true` only when a
 * real audio file started playing. This is the hook future voice packs plug
 * into — drop a file into the manifest and guided narration "just works".
 */
export async function playNarrationIfAvailable(
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

  // A newer play/stop won while we were resolving audio, or there is simply no
  // recording — either way, play nothing.
  if (mySession !== session || !url) {
    options.onStopped?.();
    return false;
  }

  try {
    return await playLoaded(url, options, mySession);
  } catch {
    if (mySession === session) {
      clearActiveCallbacks();
      options.onStopped?.();
    }
    return false;
  }
}
