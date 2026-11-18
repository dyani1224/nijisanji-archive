import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configured = !!url && !!key;
export const supabase = createClient(url || "https://example.supabase.co", key || "public-anon-key-missing", {
  auth: { persistSession: true, autoRefreshToken: true },
});
