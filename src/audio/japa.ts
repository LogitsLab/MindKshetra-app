import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import {
  hasJapaChant,
  japaChantDurationMs,
  type JapaChantId,
} from "@/audio/japaChants";

export {
  hasJapaChant,
  japaChantDurationMs,
  JAPA_CHANT_IDS,
  JAPA_CHANT_DURATIONS_MS,
} from "@/audio/japaChants";
export type { JapaChantId } from "@/audio/japaChants";

/**
 * Bundled one-shot recitations. Played on each assisted tap. Never TTS,
 * including when the id has no file (custom naam).
 */
const BUNDLED: Record<JapaChantId, number> = {
  om: require("../../assets/audio/japa/om.m4a"),
  "om-namo-bhagavate-vasudevaya": require("../../assets/audio/japa/om-namo-bhagavate-vasudevaya.m4a"),
  "hare-krishna": require("../../assets/audio/japa/hare-krishna.m4a"),
  "so-ham": require("../../assets/audio/japa/so-ham.m4a"),
  "om-namah-shivaya": require("../../assets/audio/japa/om-namah-shivaya.m4a"),
  gayatri: require("../../assets/audio/japa/gayatri.m4a"),
  mahamrityunjaya: require("../../assets/audio/japa/mahamrityunjaya.m4a"),
};

let player: AudioPlayer | null = null;
let playingUntil = 0;
let audioModeSet = false;

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

export function stopJapaChant(): void {
  release(player);
  player = null;
  playingUntil = 0;
}

/** Whether a recitation is (still) within its clip length. */
export function isJapaChantPlaying(): boolean {
  return player != null && Date.now() < playingUntil;
}

/**
 * Play the recitation for this mantra. Safe on a missing id (no-op).
 *
 * By default an assisted tap lets a still-playing clip finish instead of
 * chopping it to the opening syllables — the long recitations (Gayatri,
 * Mahamrityunjaya, Hare Krishna) never played fully before. Pass
 * `{ interrupt: true }` (the picker's preview) to always restart.
 */
export async function playJapaChant(
  mantraId: string,
  opts?: { interrupt?: boolean }
): Promise<boolean> {
  if (!hasJapaChant(mantraId)) {
    stopJapaChant();
    return false;
  }
  if (!opts?.interrupt && isJapaChantPlaying()) return true;
  stopJapaChant();
  try {
    await ensureAudioMode();
    const p = createAudioPlayer(BUNDLED[mantraId]);
    p.loop = false;
    p.volume = 0.92;
    p.play();
    player = p;
    playingUntil = Date.now() + japaChantDurationMs(mantraId);
    return true;
  } catch {
    stopJapaChant();
    return false;
  }
}
