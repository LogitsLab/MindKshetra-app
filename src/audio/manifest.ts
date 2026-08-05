import AsyncStorage from "@react-native-async-storage/async-storage";
import { speechHash } from "@/audio/hash";

/**
 * Client view of the audio bucket's manifest.json — pre-generated narration
 * keyed by speech-text hash, Sanskrit recitation keyed "chapter-verse".
 * Cached for a day in AsyncStorage so cold starts stay offline-safe; absence
 * of the manifest or a key means "device TTS as before", never an error.
 */
export type AudioManifest = {
  version: number;
  tts: { en: Record<string, string>; hi: Record<string, string> };
  recitation: Record<string, string>;
};

const CACHE_KEY = "mindkshetra-audio-manifest-v2";
// Short TTL so newly generated meditation TTS lands without reinstalling.
const CACHE_MS = 60 * 60 * 1000;

let cached: AudioManifest | null | undefined;
let inflight: Promise<AudioManifest | null> | null = null;

function bucketBase(): string | null {
  const explicit = process.env.EXPO_PUBLIC_AUDIO_BASE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!url) return null;
  return `${url}/storage/v1/object/public/audio`;
}

async function fetchManifest(): Promise<AudioManifest | null> {
  const base = bucketBase();
  if (!base) return null;
  try {
    const stored = await AsyncStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { at: number; manifest: AudioManifest };
      if (Date.now() - parsed.at < CACHE_MS) return parsed.manifest;
    }
  } catch {
    /* fall through to network */
  }
  try {
    const res = await fetch(`${base}/manifest.json`);
    if (!res.ok) return null;
    const manifest = (await res.json()) as AudioManifest;
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ at: Date.now(), manifest })
    ).catch(() => undefined);
    return manifest;
  } catch {
    // Offline — try any stale cache rather than nothing.
    try {
      const stored = await AsyncStorage.getItem(CACHE_KEY);
      if (stored) {
        return (JSON.parse(stored) as { manifest: AudioManifest }).manifest;
      }
    } catch {
      /* ignore */
    }
    return null;
  }
}

export async function getAudioManifest(): Promise<AudioManifest | null> {
  if (cached !== undefined) return cached;
  if (inflight) return inflight;
  inflight = fetchManifest().then((manifest) => {
    cached = manifest;
    inflight = null;
    return manifest;
  });
  return inflight;
}

export async function resolveSpeechUrl(
  text: string,
  lang: "en" | "hi"
): Promise<string | null> {
  const [manifest, base] = [await getAudioManifest(), bucketBase()];
  if (!manifest || !base) return null;
  const path = manifest.tts?.[lang]?.[speechHash(text)];
  return path ? `${base}/${path}` : null;
}

export async function resolveRecitationUrl(
  chapter: number,
  verse: number
): Promise<string | null> {
  const [manifest, base] = [await getAudioManifest(), bucketBase()];
  if (!manifest || !base) return null;
  const path = manifest.recitation?.[`${chapter}-${verse}`];
  return path ? `${base}/${path}` : null;
}
