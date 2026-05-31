import { createClient } from '@supabase/supabase-js';

// Nuskaitomi Supabase aplinkos kintamieji.
// Vercel talpinimo metu juos reikės įvesti Vercel valdymo skyde.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Įspėjimas, jei kintamieji dar nėra nustatyti vietinėje aplinkoje
  console.warn(
    'Supabase aplinkos kintamieji nerasti! Nustatykite NEXT_PUBLIC_SUPABASE_URL ir NEXT_PUBLIC_SUPABASE_ANON_KEY savo .env failuose.'
  );
}

// Inicijuojame bendrą Supabase klientą aplikacijai
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
