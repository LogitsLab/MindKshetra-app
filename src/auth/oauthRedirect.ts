import Constants, { ExecutionEnvironment } from "expo-constants";
import { makeRedirectUri } from "expo-auth-session";

function apiOrigin(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "https://mind.logitslab.com").replace(
    /\/$/,
    ""
  );
}

/**
 * Redirect URI for Google OAuth and email magic links.
 *
 * Expo Go deep links look like `exp://192.168.x.x:8081/--/auth/callback`.
 * Supabase Auth strips those after the provider returns (private IP check),
 * so AuthSession never completes. In Expo Go we use the paired HTTPS
 * `/auth/native` page instead — openAuthSessionAsync captures it.
 *
 * Dev/production builds use the `mindkshetra://` scheme.
 */
export function resolveAuthRedirectUri(): string {
  const inExpoGo =
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  if (inExpoGo) {
    return `${apiOrigin()}/auth/native`;
  }

  return makeRedirectUri({
    scheme: "mindkshetra",
    path: "auth/callback",
    native: "mindkshetra://auth/callback",
  });
}
