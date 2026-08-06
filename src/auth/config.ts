export type SupabasePublicEnv = {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
};

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

/**
 * Read the public Supabase configuration.
 *
 * Expo/Metro only inlines static `process.env.EXPO_PUBLIC_*` member access into
 * production bundles. Do not read through an aliased `env` object in the default
 * path — that leaves keys undefined at runtime and crashes cold start.
 */
export function getSupabaseConfig(
  env: SupabasePublicEnv = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  }
): SupabaseConfig {
  const url = env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const missing: string[] = [];

  if (!url) missing.push("EXPO_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    throw new Error(
      `Supabase configuration is missing: ${missing.join(
        ", "
      )}. Set the required public environment variables before starting or building the app.`
    );
  }

  return { url, anonKey };
}
