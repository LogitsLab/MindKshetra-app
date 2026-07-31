import Constants from "expo-constants";

/** Marketing / store version from app.json (e.g. 1.1.3). */
export function getAppVersion(): string {
  return (
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    "0.0.0"
  );
}

/**
 * Display string for About / Account footers.
 * Includes native build when present (TestFlight / Play).
 */
export function getAppVersionLabel(): string {
  const version = getAppVersion();
  const build = Constants.nativeBuildVersion;
  if (build && build !== version) {
    return `v${version} (${build})`;
  }
  return `v${version}`;
}
