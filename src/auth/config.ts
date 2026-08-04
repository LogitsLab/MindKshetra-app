export type SupabasePublicEnv = {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
};

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

/**
 * Read the public Supabase configuration at module initialization.
 *
 * Expo embeds both values in the client bundle, so neither is a server secret.
 * Error messages name missing variables but never include configured values.
 */
export function getSupabaseConfig(
  env: SupabasePublicEnv = process.env as SupabasePublicEnv
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
