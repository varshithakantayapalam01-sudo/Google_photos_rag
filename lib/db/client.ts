/**
 * Supabase client factory
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseAnonClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

const PLACEHOLDER_URL = "https://placeholder-supabase.supabase.co";
const PLACEHOLDER_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy-anon-key";
const PLACEHOLDER_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy-service-key";

/**
 * Check if real live Supabase credentials are configured
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    anonKey &&
    !url.includes("127.0.0.1") &&
    !url.includes("placeholder") &&
    anonKey !== "mock-anon-key" &&
    !anonKey.includes("dummy")
  );
}

/**
 * Public client using anon key (read-only for research data)
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseAnonClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_ANON_KEY;

    supabaseAnonClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseAnonClient;
}

/**
 * Admin client using service role key (bypasses RLS for ingestion and pipeline stages)
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || PLACEHOLDER_SERVICE_KEY;

    supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdminClient;
}

