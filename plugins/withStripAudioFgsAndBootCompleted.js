/**
 * Play Console (Android 15+) flags the combination of:
 *   - restricted FGS types from expo-audio (mediaPlayback + microphone)
 *   - BOOT_COMPLETED receivers from expo-notifications
 *
 * MindKshetra never records audio and never uses lock-screen media controls.
 * Strip those services, their FGS permissions, and boot actions on receivers
 * so a reboot cannot start a restricted foreground service.
 *
 * Tradeoff: scheduled local notifications will not restore after reboot
 * until the app is opened again.
 *
 * @see https://github.com/expo/expo/issues/41627
 */
const { withAndroidManifest } = require("expo/config-plugins");

const BOOT_ACTIONS = new Set([
  "android.intent.action.BOOT_COMPLETED",
  "android.intent.action.LOCKED_BOOT_COMPLETED",
  "android.intent.action.QUICKBOOT_POWERON",
  "com.htc.intent.action.QUICKBOOT_POWERON",
]);

const AUDIO_SERVICE_SUFFIXES = [
  "AudioControlsService",
  "AudioRecordingService",
];

const FGS_PERMS_TO_DROP_WHEN_UNUSED = new Set([
  "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
  "android.permission.FOREGROUND_SERVICE_MICROPHONE",
]);

function serviceName(service) {
  return service?.$?.["android:name"] ?? "";
}

function isExpoAudioFgs(service) {
  const name = serviceName(service);
  return AUDIO_SERVICE_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

function stripBootActions(receiver) {
  const filters = receiver["intent-filter"];
  if (!Array.isArray(filters)) return;
  for (const filter of filters) {
    const actions = filter.action;
    if (!Array.isArray(actions)) continue;
    filter.action = actions.filter(
      (action) => !BOOT_ACTIONS.has(action?.$?.["android:name"])
    );
  }
  receiver["intent-filter"] = filters.filter((filter) => {
    const actions = filter.action;
    return Array.isArray(actions) && actions.length > 0;
  });
  if (receiver["intent-filter"].length === 0) {
    delete receiver["intent-filter"];
  }
}

function withStripAudioFgsAndBootCompleted(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const app = manifest.application?.[0];
    if (!app) return mod;

    if (Array.isArray(app.service)) {
      app.service = app.service.filter((service) => !isExpoAudioFgs(service));
    }

    for (const receiver of app.receiver ?? []) {
      stripBootActions(receiver);
    }

    const remainingFgsTypes = (app.service ?? [])
      .map((service) => service?.$?.["android:foregroundServiceType"] ?? "")
      .join(" ");
    const keepMedia = remainingFgsTypes.includes("mediaPlayback");
    const keepMic = remainingFgsTypes.includes("microphone");

    const perms = manifest["uses-permission"] ?? [];
    manifest["uses-permission"] = perms.filter((perm) => {
      const name = perm?.$?.["android:name"];
      if (name === "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK") {
        return keepMedia;
      }
      if (name === "android.permission.FOREGROUND_SERVICE_MICROPHONE") {
        return keepMic;
      }
      if (
        name === "android.permission.FOREGROUND_SERVICE" &&
        !keepMedia &&
        !keepMic
      ) {
        return false;
      }
      if (FGS_PERMS_TO_DROP_WHEN_UNUSED.has(name) && !keepMedia && !keepMic) {
        return false;
      }
      return true;
    });

    return mod;
  });
}

module.exports = withStripAudioFgsAndBootCompleted;
