const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Standard client for most operations (should respect RLS)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Admin client with service_role key (bypasses RLS) - use ONLY when necessary
const adminSupabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = { supabase, adminSupabase };
