import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

function getAdminEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Missing Supabase admin environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
  }

  return { url, secretKey };
}

/**
 * Returns a server-only Supabase admin client.
 * Use this only for trusted operations that should bypass user-level RLS checks.
 */
export function createSupabaseAdminClient() {
  const { url, secretKey } = getAdminEnv();

  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
