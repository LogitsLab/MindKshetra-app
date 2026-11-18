/**
 * google-services.json is gitignored (public repo), so EAS cloud builds
 * receive it through the GOOGLE_SERVICES_JSON file-type env var, which
 * materializes as a temp file whose path lands in process.env. Local
 * dev/prebuild uses the checked-out file via app.json's static path.
 *
 * Meta / Facebook App Events: set EXPO_PUBLIC_FACEBOOK_APP_ID (+ client
 * token for iOS) in EAS secrets. Plugin is only injected when App ID is set
 * so Preview / local Expo Go builds stay clean.
 */
module.exports = ({ config }) => {
  const facebookAppId = (
    process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ||
    process.env.FACEBOOK_APP_ID ||
    ""
  ).trim();
  const facebookClientToken = (
    process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN ||
    process.env.FACEBOOK_CLIENT_TOKEN ||
    ""
  ).trim();

  const plugins = [...(config.plugins || [])];
  if (!plugins.includes("expo-tracking-transparency")) {
    plugins.push("expo-tracking-transparency");
  }
  if (facebookAppId) {
    plugins.push([
      "react-native-fbsdk-next",
      {
        appID: facebookAppId,
        clientToken: facebookClientToken || undefined,
        displayName: "MindKshetra",
        scheme: `fb${facebookAppId}`,
        advertiserIDCollectionEnabled: false,
        autoLogAppEventsEnabled: true,
        isAutoInitEnabled: true,
      },
    ]);
  }

  return {
    ...config,
    plugins,
    ios: {
      ...config.ios,
      infoPlist: {
        ...(config.ios?.infoPlist || {}),
        NSUserTrackingUsageDescription:
          "MindKshetra uses this only to measure whether ads helped you find the app — never to sell your data. You can decline.",
      },
    },
    android: {
      ...config.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? config.android.googleServicesFile,
    },
    extra: {
      ...(config.extra || {}),
      facebookAppId: facebookAppId || undefined,
    },
  };
};
