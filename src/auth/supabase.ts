import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/auth/config";

const { url, anonKey } = getSupabaseConfig();

/** Reaching this export means initialization validated both required values. */
export const supabaseConfigured = true;

export const supabase = createClient(
  url,
  anonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
