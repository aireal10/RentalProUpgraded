
import { createClient } from '@supabase/supabase-js';

// Use fallback values to prevent app crash if env vars are missing
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'placeholder';

if (!(import.meta as any).env.VITE_SUPABASE_URL || !(import.meta as any).env.VITE_SUPABASE_ANON_KEY) {
  console.warn("Supabase URL or Anon Key is missing in services/supabase.ts");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
