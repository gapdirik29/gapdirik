import { createClient } from '@supabase/supabase-js';

// HÜKÜMDAR PRIME "PRO ENGINE" SUPABASE CLIENT
// Unity kalitesinde veri senkronizasyonu ve kurumsal SQL gücü.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (supabaseUrl === 'https://placeholder-url.supabase.co') {
  console.warn('⚠️ HÜKÜMDAR UYARISI: Supabase URL/Key eksik! Lütfen .env deryasını mızmar edin.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
