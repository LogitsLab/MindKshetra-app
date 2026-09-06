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
    // Download to a temp sibling first, then move into place. An interrupted
    // download (app killed / network drop) otherwise leaves a truncated file at
    // the real path: it passes the `size > 0` check on the next Listen, so a
    // partial recitation plays and cuts off abruptly — and stays cached that way
    // until the user clears storage.
    const part = new File(dir, cacheFileName(remoteUrl) + ".part");
    try {
      if (part.exists) part.delete();
    } catch {
      /* ignore */
    }
    const downloaded = await File.downloadFileAsync(remoteUrl, part, {
      idempotent: true,
    });
    if (!downloaded.exists || downloaded.size <= 0) {
      try {
        if (part.exists) part.delete();
      } catch {
        /* ignore */
      }
      return null;
    }
    try {
      if (file.exists) file.delete();
      downloaded.move(file);
    } catch {
      // Move failed — the fully-downloaded temp file is still whole to play from.
      return downloaded.exists && downloaded.size > 0 ? downloaded.uri : null;
    }
    return file.exists && file.size > 0 ? file.uri : null;
  } catch {
    return null;
  }
}
