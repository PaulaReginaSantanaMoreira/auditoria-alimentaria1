import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com privilégios administrativos de Service Role.
 * EXCLUSIVO para uso no lado do servidor (API Routes e Server Actions).
 * NUNCA importar nem expor este cliente em componentes React de cliente ("use client").
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Credenciais administrativas do Supabase (NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY) não estão configuradas."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
