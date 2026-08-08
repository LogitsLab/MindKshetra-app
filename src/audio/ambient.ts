import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";

/**
 * Soft looping bed under silence countdowns. Uses the hosted drone on the
 * public audio bucket (same file the web player prefers).
 */
const DRONE_PATH = "ambient/meditation-drone.m4a";
/** Optional one-shot at sit end — fail soft if the bucket object is missing. */
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

export function ambientLoopUrl(): string | null {
  const base = bucketBase();
  return base ? `${base}/${DRONE_PATH}` : null;
}

export function softBellUrl(): string | null {
  const base = bucketBase();
  return base ? `${base}/${BELL_PATH}` : null;
}

/** One-shot soft bell when the last phase ends. Never throws; missing = no-op. */
export async function playSoftBell(volume = 0.45): Promise<boolean> {
  const url = softBellUrl();
  if (!url) return false;
  try {
    if (bellPlayer) {
      try {
        bellPlayer.pause();
        bellPlayer.remove();
      } catch {
        /* already released */
      }
      bellPlayer = null;
    }
    if (!audioModeSet) {
      audioModeSet = true;
      await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    }
    const p = createAudioPlayer({ uri: url });
    p.loop = false;
    p.volume = Math.min(1, Math.max(0, volume));
    bellPlayer = p;
    p.play();
    return true;
  } catch {
    if (bellPlayer) {
      try {
        bellPlayer.remove();
      } catch {
        /* ignore */
      }
      bellPlayer = null;
    }
    return false;
  }
}

export function stopAmbient(): void {
  running = false;
  if (!player) return;
  try {
    player.pause();
    player.remove();
  } catch {
    /* already released */
  }
  player = null;
}

export async function startAmbient(volume = 0.35): Promise<boolean> {
  const url = ambientLoopUrl();
  if (!url) return false;

  stopAmbient();
  running = true;

  try {
    if (!audioModeSet) {
      audioModeSet = true;
      await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    }
    const p = createAudioPlayer({ uri: url });
    p.loop = true;
    p.volume = Math.min(1, Math.max(0, volume));
    player = p;
    p.play();
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
