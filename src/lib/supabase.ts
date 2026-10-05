import { createClient } from "@supabase/supabase-js";

export function resolveSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    url,
    anonKey,
    serviceRoleKey,
  };
}

export function hasSupabaseConfig(): boolean {
  const { url, anonKey } = resolveSupabaseConfig();
  return Boolean(url && anonKey);
}

export function getSupabaseClient() {
  const { url, anonKey } = resolveSupabaseConfig();

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseAdminClient() {
  const { url, serviceRoleKey } = resolveSupabaseConfig();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabase = getSupabaseClient();
export const supabaseAdmin = getSupabaseAdminClient();
