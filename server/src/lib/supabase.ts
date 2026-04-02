import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// HÜKÜMDAR PRIME "PRO ENGINE" SERVER-SIDE SUPABASE CLIENT
// SQL gücü ve sarsılmaz bakiye yönetimi için merkezi istemci.

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ HÜKÜMDAR UYARISI: Server-side Supabase URL/Key eksik! SQL fethine (Database) devam edilemiyor.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
