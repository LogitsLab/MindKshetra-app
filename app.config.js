/**
 * google-services.json is gitignored (public repo), so EAS cloud builds
 * receive it through the GOOGLE_SERVICES_JSON file-type env var, which
 * materializes as a temp file whose path lands in process.env. Local
 * dev/prebuild uses the checked-out file via app.json's static path.
 */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? config.android.googleServicesFile,
  },
});
