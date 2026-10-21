import { NextRequest } from "next/server";
import { verifySessionToken } from "./jwt-service";
import { UserRole, AuditAccessScope } from "@/domain/security/roles-and-permissions";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";

export interface ResolvedSession {
  userId?: string;
  email?: string;
  role: UserRole;
  scope: AuditAccessScope;
  tenantId?: string;
  isAuthenticated: boolean;
}

/**
 * Resolve o usuário autenticado, seu papel (UserRole) e seu escopo de acesso (AuditAccessScope)
 * a partir do JWT assinado ou do Supabase Auth.
 * Garante que a revogação/invalidação de sessão ativa no Supabase seja estritamente respeitada.
 */
export async function resolveSessionAndRole(req: NextRequest): Promise<ResolvedSession> {
  // 1. Tentar ler do Header Authorization: Bearer <token>
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  // 2. Tentar ler do Cookie bioaudit_token
  const cookieToken = req.cookies.get("bioaudit_token")?.value;

  const token = bearerToken || cookieToken;

  if (token) {
    try {
      const payload = await verifySessionToken(token);

      // Em modo de produção / Supabase (não-demo), verificar se a sessão foi invalidada/revogada no Supabase
      if (process.env.NEXT_PUBLIC_APP_MODE !== "demo") {
        try {
          const supabase = await createServerSupabaseClient();
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError || !user) {
            // Sessão foi ativamente encerrada ou revogada no Supabase
            return {
              role: "AUDITOR",
              scope: "TENANT",
              isAuthenticated: false,
            };
          }
        } catch {
          // Contingência de rede offline em campo
        }
      }

      let role: UserRole = "AUDITOR";
      if (
        payload.role === "PLATFORM_SUPERADMIN" ||
        payload.role === "superadmin" ||
        String(payload.role).toLowerCase().includes("superadmin")
      ) {
        role = "PLATFORM_SUPERADMIN";
      } else if (payload.role === "TENANT_ADMIN") {
        role = "TENANT_ADMIN";
      } else if (payload.role === "VIEWER") {
        role = "VIEWER";
      }

      const scope: AuditAccessScope =
        role === "PLATFORM_SUPERADMIN"
          ? "CONFIDENTIAL"
          : (payload.scope as AuditAccessScope) || "TENANT";

      return {
        userId: payload.sub,
        email: payload.email,
        role,
        scope,
        tenantId: payload.tenantId,
        isAuthenticated: true,
      };
    } catch {
      // Token inválido ou expirado, tenta fallback do Supabase
    }
  }

  // 3. Fallback: Supabase Auth Session
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        role: "AUDITOR",
        scope: "TENANT",
        isAuthenticated: false,
      };
    }

    // Checar se é Superadmin
    const { data: superuser } = await supabase
      .from("platform_superusers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (superuser) {
      return {
        userId: user.id,
        email: user.email,
        role: "PLATFORM_SUPERADMIN",
        scope: "CONFIDENTIAL",
        isAuthenticated: true,
      };
    }

    // Checar papel no Tenant
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("role, tenant_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    let tenantRole: UserRole = "AUDITOR";
    if (tenantUser?.role === "TENANT_ADMIN") tenantRole = "TENANT_ADMIN";
    if (tenantUser?.role === "VIEWER") tenantRole = "VIEWER";

    return {
      userId: user.id,
      email: user.email,
      role: tenantRole,
      scope: "TENANT",
      tenantId: tenantUser?.tenant_id,
      isAuthenticated: true,
    };
  } catch {
    return {
      role: "AUDITOR",
      scope: "TENANT",
      isAuthenticated: false,
    };
  }
}
