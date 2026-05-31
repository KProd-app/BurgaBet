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

// Hibridinė saugykla (hybridStorage) Supabase sesijos išsaugojimui.
// Naudoja localStorage kaip pagrindinę saugyklą, bet dubliuoja duomenis į pirmosios šalies (first-party)
// slapukus (cookies) kaip atsarginį variantą (pvz., naršyklės Incognito ar privačios peržiūros režimams).
const hybridStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    
    // 1. Bandome nuskaityti iš localStorage
    let val: string | null = null;
    try {
      val = window.localStorage.getItem(key);
    } catch (e) {
      console.warn("Nepavyko nuskaityti iš localStorage:", e);
    }
    
    // 2. Jei nerasta (pvz. išvalyta arba užblokuota), bandome iš slapukų
    if (!val) {
      try {
        const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
        if (match) {
          val = decodeURIComponent(match[2]);
        }
      } catch (e) {
        console.warn("Nepavyko nuskaityti slapuko:", e);
      }
    }
    return val;
  },
  
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    
    // 1. Įrašome į localStorage
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Nepavyko įrašyti į localStorage:", e);
    }
    
    // 2. Įrašome į slapuką (galioja 7 dienas, su secure ir samesite nustatymais)
    try {
      document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=604800; secure; samesite=lax`;
    } catch (e) {
      console.warn("Nepavyko įrašyti slapuko:", e);
    }
  },
  
  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    
    // 1. Triname iš localStorage
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn("Nepavyko ištrinti iš localStorage:", e);
    }
    
    // 2. Triname slapuką
    try {
      document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    } catch (e) {
      console.warn("Nepavyko ištrinti slapuko:", e);
    }
  }
};

// Inicijuojame bendrą Supabase klientą aplikacijai su hibridine sesijos saugykla
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: hybridStorage
  }
});
