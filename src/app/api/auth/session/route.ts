import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/infrastructure/security/jwt-service";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";
import { AuditAccessScope } from "@/domain/security/roles-and-permissions";

export async function GET(request: NextRequest) {
  try {
    // 1. Tentar ler do cookie seguro "bioaudit_token"
    const cookieToken = request.cookies.get("bioaudit_token")?.value;

    // 2. Tentar ler do Header Authorization: Bearer <token>
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    const token = bearerToken || cookieToken;

    if (token) {
      try {
        const payload = await verifySessionToken(token);
        const isSuper =
          payload.role === "PLATFORM_SUPERADMIN" || payload.role === "superadmin";

        // Se NÃO estiver em modo demo, validar se a sessão no Supabase ainda é válida/ativa
        if (process.env.NEXT_PUBLIC_APP_MODE !== "demo") {
          try {
            const supabase = await createServerSupabaseClient();
            const {
              data: { user },
              error: authError,
            } = await supabase.auth.getUser();

            if (authError || !user) {
              // Sessão foi ativamente invalidada/revogada no Supabase!
              const unauthRes = NextResponse.json(
                {
                  authenticated: false,
                  error: "Sessão invalidada ou revogada pelo servidor de autenticação.",
                },
                { status: 401 }
              );
              unauthRes.cookies.set("bioaudit_token", "", {
                path: "/",
                maxAge: 0,
                expires: new Date(0),
              });
              return unauthRes;
            }
          } catch {
            // Em caso de falha transitória de rede (modo de contingência offline em campo),
            // a integridade da assinatura criptográfica JWT permanece preservada
          }
        }

        const scope: AuditAccessScope = isSuper
          ? "CONFIDENTIAL"
          : (payload.scope as AuditAccessScope) || "TENANT";

        return NextResponse.json({
          authenticated: true,
          user: {
            id: payload.sub,
            email: payload.email,
            role: isSuper ? "superadmin" : "auditor",
            scope,
            tenantId: payload.tenantId,
          },
          redirectTo: isSuper ? "/superadmin" : "/auditorias/nova",
        });
      } catch {
        // Token inválido ou expirado
      }
    }

    // 3. Fallback: verificar se há sessão ativa via Supabase SSR
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error: supabaseError,
      } = await supabase.auth.getUser();

      if (user && !supabaseError) {
        const { data: superuser } = await supabase
          .from("platform_superusers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        const isSuper = !!superuser;

        let tenantId: string | undefined = undefined;
        if (!isSuper) {
          const { data: tenantUser } = await supabase
            .from("tenant_users")
            .select("tenant_id")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();
          tenantId = tenantUser?.tenant_id;
        }

        const scope: AuditAccessScope = isSuper ? "CONFIDENTIAL" : "TENANT";

        return NextResponse.json({
          authenticated: true,
          user: {
            id: user.id,
            email: user.email,
            role: isSuper ? "superadmin" : "auditor",
            scope,
            tenantId,
          },
          redirectTo: isSuper ? "/superadmin" : "/auditorias/nova",
        });
      }
    } catch {
      // Falha no Supabase Auth
    }

    const unauthResponse = NextResponse.json({ authenticated: false }, { status: 401 });
    if (cookieToken) {
      unauthResponse.cookies.set("bioaudit_token", "", {
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
    }
    return unauthResponse;
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 401 });
  }
}
