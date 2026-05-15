import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const SUPABASE_BUCKETS = {
  images: import.meta.env.VITE_SUPABASE_IMAGES_BUCKET || 'wedding-images',
  audio: import.meta.env.VITE_SUPABASE_AUDIO_BUCKET || 'wedding-audio',
} as const;

export const SUPABASE_INVITATIONS_TABLE = import.meta.env.VITE_SUPABASE_INVITATIONS_TABLE || 'invitations';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;

export const requireSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
};
