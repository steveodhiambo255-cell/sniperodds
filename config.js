
/* =========================================
   SNIPER ODDS - SUPABASE CONFIGURATION
========================================= */

const SUPABASE_URL =
  "https://gddyhbjslwcgtqdtbzvu.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_3uoDL_R8ylwHmHiJLTGenA_geIrsFxW";

/* Check Supabase library */
if (!window.supabase || !window.supabase.createClient) {
  throw new Error(
    "Supabase library failed to load. Check the internet connection."
  );
}

/* Create one shared Supabase client */
window.sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* Support older website files */
window.supabaseClient = window.sb;

console.log("SNIPER ODDS Supabase connected successfully.");
