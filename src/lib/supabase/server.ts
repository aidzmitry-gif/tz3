import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Серверный клиент Supabase под service_role ключом.
 *
 * Важно: этот клиент НИКОГДА не должен попадать в браузер. Он обходит RLS,
 * поэтому используется только в серверных компонентах, route handlers и
 * server actions. Файл помечен "server-only" — сборка упадёт, если его
 * случайно импортировать в клиентский компонент.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
