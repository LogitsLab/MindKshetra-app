import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";

/**
 * Soft looping bed under silence. Hosted files on the public audio bucket
 * first; bundled CC0 originals if the object 404s so sits are never dry.
 */
export type AmbientBed = "off" | "drone" | "bowls" | "rain";

const HOSTED: Record<Exclude<AmbientBed, "off">, string> = {
  drone: "ambient/meditation-drone.m4a",
  bowls: "ambient/bowls.m4a",
  rain: "ambient/rain.m4a",
};

const BUNDLED: Record<Exclude<AmbientBed, "off">, number> = {
  drone: require("../../assets/audio/meditation-drone.m4a"),
  bowls: require("../../assets/audio/bowls.m4a"),
  rain: require("../../assets/audio/rain.m4a"),
};

const BUNDLED_BELL = require("../../assets/audio/soft-bell.m4a");
const BELL_PATH = "ambient/soft-bell.m4a";

let player: AudioPlayer | null = null;
let bellPlayer: AudioPlayer | null = null;
let audioModeSet = false;
let running = false;

function bucketBase(): string | null {
  const explicit = process.env.EXPO_PUBLIC_AUDIO_BASE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!url) return null;
  return `${url}/storage/v1/object/public/audio`;
}

export function ambientLoopUrl(
  bed: Exclude<AmbientBed, "off"> = "drone"
): string | null {
  const base = bucketBase();
  return base ? `${base}/${HOSTED[bed]}` : null;
}

export function softBellUrl(): string | null {
  const base = bucketBase();
  return base ? `${base}/${BELL_PATH}` : null;
}

async function ensureAudioMode(): Promise<void> {
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

function release(p: AudioPlayer | null): void {
  if (!p) return;
  try {
    p.pause();
  } catch {
    /* ignore */
  }
  try {
    p.remove();
  } catch {
    /* already released */
  }
}

function playSource(source: { uri: string } | number, loop: boolean, volume: number) {
  const p = createAudioPlayer(source);
  p.loop = loop;
  p.volume = Math.min(1, Math.max(0, volume));
  p.play();
  return p;
}

/** One-shot soft bell when the last phase ends. Never throws; missing = no-op. */
export async function playSoftBell(volume = 0.45): Promise<boolean> {
  release(bellPlayer);
  bellPlayer = null;
  try {
    if (!audioModeSet) await ensureAudioMode();
    const url = softBellUrl();
    if (url) {
      try {
        const p = playSource({ uri: url }, false, volume);
        bellPlayer = p;
        return true;
      } catch {
        /* fall through to bundled */
      }
    }
    const p = playSource(BUNDLED_BELL, false, volume);
    bellPlayer = p;
    return true;
  } catch {
    release(bellPlayer);
    bellPlayer = null;
    return false;
  }
}

export function stopAmbient(): void {
  running = false;
  release(player);
  player = null;
}

/**
 * Start the ambient bed. Hosted URL first, bundled asset if that fails.
 * `bed: "off"` is a no-op. Safe to call repeatedly — restarts cleanly.
 */
export async function startAmbient(
  volume = 0.35,
  bed: AmbientBed = "drone"
): Promise<boolean> {
  stopAmbient();
  if (bed === "off") return false;
  running = true;

  try {
    if (!audioModeSet) await ensureAudioMode();
    const url = ambientLoopUrl(bed);
    if (url) {
      try {
        const p = playSource({ uri: url }, true, volume);
        player = p;
        if (!running) {
          stopAmbient();
          return false;
        }
        return true;
      } catch {
        /* bundled fallback */
      }
    }
    if (!running) return false;
    const p = playSource(BUNDLED[bed], true, volume);
    player = p;
    if (!running) {
      stopAmbient();
      return false;
    }
    return true;
  } catch {
    stopAmbient();
    return false;
  }
}

export function isAmbientRunning(): boolean {
  return running && player != null;
}

export function releaseAmbientPlayers(): void {
  stopAmbient();
  release(bellPlayer);
  bellPlayer = null;
}
