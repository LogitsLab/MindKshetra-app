import { Directory, File, Paths } from "expo-file-system";
import { cacheFileName } from "@/audio/hash";

const DIR_NAME = "mindkshetra-audio";

function audioDir(): Directory {
  return new Directory(Paths.cache, DIR_NAME);
}

/**
 * Download `remoteUrl` into the cache directory and return a local `file://`
 * URI. Returns null when the filesystem or network fails so callers can play
 * the remote URL as a fallback.
 *
 * Prefetch and play share this path so the first Listen after a cold start
 * is a local file, not a race against expo-audio remote buffering.
 */
export async function localAudioUri(
  remoteUrl: string
): Promise<string | null> {
  if (!remoteUrl.startsWith("http://") && !remoteUrl.startsWith("https://")) {
    return remoteUrl;
  }
  try {
    const dir = audioDir();
    if (!dir.exists) {
      dir.create({ idempotent: true, intermediates: true });
    }
    const file = new File(dir, cacheFileName(remoteUrl));
    if (file.exists && file.size > 0) {
      return file.uri;
    }
    const downloaded = await File.downloadFileAsync(remoteUrl, file, {
      idempotent: true,
    });
    return downloaded.exists && downloaded.size > 0 ? downloaded.uri : null;
  } catch {
    return null;
  }
}
