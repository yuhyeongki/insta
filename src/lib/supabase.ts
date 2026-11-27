import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseKey = (
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined)
)?.trim();

export const isSupabaseAuthEnabled = Boolean(supabaseUrl && supabaseKey);

export const supabase: SupabaseClient | null = isSupabaseAuthEnabled
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;
