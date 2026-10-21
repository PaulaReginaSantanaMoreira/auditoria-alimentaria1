import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-supabase.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key";

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Em Server Components de leitura, mutação de cookies é ignorada
        }
      },
    },
  });
}

/**
 * Validação rigorosa de privilégio de SuperAdministrador.
 * Lança erro se o usuário não estiver autenticado ou não pertencer a platform_superusers.
 */
export async function ensureSuperAdmin() {
  if (process.env.NEXT_PUBLIC_APP_MODE === "demo") {
    return { id: "demo-superadmin", email: "admin@bioauditpro.com" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("UNAUTHORIZED: Sessão expirada ou não autenticada.");
  }

  const { data: superuser, error: dbError } = await supabase
    .from("platform_superusers")
    .select("id, email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (dbError || !superuser) {
    throw new Error("FORBIDDEN: Apenas SuperAdministradores têm acesso a este recurso.");
  }

  return user;
}
