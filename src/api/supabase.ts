import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient<Database> | null = null;

/** Party mode needs a backend; solo play never does. */
export function isBackendConfigured(): boolean {
  return Boolean(url && anonKey);
}

/** Created on first use so solo players never load a session or open a socket. */
export function getSupabase(): SupabaseClient<Database> {
  if (!url || !anonKey) throw new Error('Supabase is not configured');
  client ??= createClient<Database>(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'gimmiefive.auth' },
  });
  return client;
}
