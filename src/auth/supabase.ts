import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { fetch as expoFetch } from "expo/fetch";
import { getSupabaseConfig } from "@/auth/config";

const { url, anonKey } = getSupabaseConfig();

/** Reaching this export means initialization validated both required values. */
export const supabaseConfigured = true;

/**
 * React Native's XHR-backed fetch throws "Network request failed" for some
 * POSTs on device (Expo Go included). The rest of the app already uses
 * `expo/fetch` for the same reason.
 */
const fetchForSupabase: typeof fetch = (input, init) => {
  const href =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  return expoFetch(href, init as never) as unknown as Promise<Response>;
};

export const supabase = createClient(
  url,
  anonKey,
  {
    global: { fetch: fetchForSupabase },
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
