// SNIPER ODDS - Supabase Configuration

const SUPABASE_URL =
    "https://gddyhbjslwcgtqdtbzvu.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_3uoDL_R8ylwHmHiJLTGenA_geIrsFxW";

const sb = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);