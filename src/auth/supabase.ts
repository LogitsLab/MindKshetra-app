import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured = Boolean(url && anon);

/**
 * Fail loudly in development, degrade quietly in production.
 *
 * The placeholder client below keeps imports from throwing, but it also meant a
 * missing EXPO_PUBLIC_SUPABASE_* pair produced an app that booted normally and
 * silently failed every auth call. In dev that should stop you immediately; in a
 * shipped build a hard crash at launch is worse for the user than degraded auth,
 * so there we only warn. See /autoplan finding E6.
 */
if (!supabaseConfigured) {
  const message =
    "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and " +
    "EXPO_PUBLIC_SUPABASE_ANON_KEY in .env (see .env.example). " +
    "Auth, favorites, and saved reflections will not work.";
  if (__DEV__) throw new Error(message);
  console.warn(message);
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anon || "placeholder",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
