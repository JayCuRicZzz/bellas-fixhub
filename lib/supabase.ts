// Supabase clients (Auth + Storage). Database queries go through lib/db.ts (postgres.js).
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const noSession = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};

/** Anonymous client — sign-in, token verification, refresh. Safe anywhere (edge + node). */
export function supabaseAnon(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set');
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, noSession);
}

let adminClient: SupabaseClient | null = null;
/** Service-role client — user admin + storage uploads. SERVER ONLY. */
export function supabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not set (Supabase → Project Settings → API keys → service_role)');
  }
  adminClient = createClient(SUPABASE_URL, key, noSession);
  return adminClient;
}

/** FixHub accounts are username-based; Supabase Auth needs an email, so we map 1:1. */
export const FIXHUB_EMAIL_DOMAIN = 'fixhub.bellavilla.local';
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${FIXHUB_EMAIL_DOMAIN}`;
}
export function isFixhubEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase().endsWith(`@${FIXHUB_EMAIL_DOMAIN}`);
}
