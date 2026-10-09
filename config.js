// config.js - load AFTER the supabase CDN script, BEFORE auth.js
// Use the anon/public key ONLY. Never put the service_role key here.
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "sb_publishable_3uoDL_R8ylwHmHiJLTGenA_geIrsFxW";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
