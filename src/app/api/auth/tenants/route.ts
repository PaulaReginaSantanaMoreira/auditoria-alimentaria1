import { NextRequest, NextResponse } from "next/server";
import { resolveSessionAndRole } from "@/infrastructure/security/session-resolver";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";
import { createAdminClient } from "@/infrastructure/database/supabase/supabase-admin";
import { signSessionToken } from "@/infrastructure/security/jwt-service";

export async function GET(req: NextRequest) {
  try {
    const session = await resolveSessionAndRole(req);
    if (!session.isAuthenticated || !session.userId) {
      return NextResponse.json({ success: false, error: "No autenticado" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Se for SuperAdmin, tem acesso a todas as empresas cadastradas + Modo Plataforma Global
    if (session.role === "PLATFORM_SUPERADMIN") {
      const { data: allTenants } = await adminClient
        .from("tenants")
        .select("id, name, cif, status")
        .order("name", { ascending: true });

      const mapped = [
        {
          id: "global",
          name: "Plataforma Global (Sin Tenant)",
          cif: "MASTER",
          role: "PLATFORM_SUPERADMIN",
          status: "ACTIVE",
        },
        ...(allTenants || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          cif: t.cif,
          role: "PLATFORM_SUPERADMIN",
          status: t.status,
        })),
      ];

      const activeTenantId =
        session.tenantId && session.tenantId !== "global"
          ? session.tenantId
          : "global";

      return NextResponse.json({
        success: true,
        activeTenantId,
        tenants: mapped,
      });
    }

    // Para usuários comuns: buscar tenants vinculados em tenant_users
    const { data: memberships, error } = await adminClient
      .from("tenant_users")
      .select("role, is_active, tenant_id, tenants(id, name, cif, status)")
      .eq("user_id", session.userId)
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const mapped = (memberships || [])
      .filter((m: any) => m.tenants)
      .map((m: any) => ({
        id: m.tenant_id,
        name: m.tenants.name,
        cif: m.tenants.cif,
        role: m.role,
        status: m.tenants.status,
      }));

    return NextResponse.json({
      success: true,
      activeTenantId: session.tenantId || (mapped[0]?.id ?? null),
      tenants: mapped,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await resolveSessionAndRole(req);
    if (!session.isAuthenticated || !session.userId) {
      return NextResponse.json({ success: false, error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "ID de la empresa requerido" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    let newRole = session.role;
    let tenantName = "";

    if (session.role === "PLATFORM_SUPERADMIN") {
      if (tenantId === "global" || !tenantId || tenantId === "none") {
        // SuperAdmin desvinculado de qualquer tenant (Master Global)
        const { token, expiresAt } = await signSessionToken({
          sub: session.userId,
          email: session.email || "superadmin@bioauditpro.com",
          role: "PLATFORM_SUPERADMIN",
          scope: "CONFIDENTIAL",
        });

        const response = NextResponse.json({
          success: true,
          message: "Modo Plataforma Global (Sin Tenant) activado con éxito.",
          activeTenantId: "global",
          role: "PLATFORM_SUPERADMIN",
          token,
          expiresAt,
        });

        response.cookies.set("bioaudit_active_tenant", "global", {
          path: "/",
          httpOnly: false,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30,
        });

        response.cookies.set("bioaudit_token", token, {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });

        return response;
      }

      const { data: t } = await adminClient.from("tenants").select("name").eq("id", tenantId).maybeSingle();
      tenantName = t?.name || "Empresa";
    } else {
      // Validar se o usuário realmente tem vínculo ativo com o tenant
      const { data: member, error } = await adminClient
        .from("tenant_users")
        .select("role, tenants(name)")
        .eq("user_id", session.userId)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !member) {
        return NextResponse.json(
          { success: false, error: "No tienes permisos activos en la empresa solicitada" },
          { status: 403 }
        );
      }

      newRole = member.role === "TENANT_ADMIN" ? "TENANT_ADMIN" : member.role === "VIEWER" ? "VIEWER" : "AUDITOR";
      tenantName = (member.tenants as any)?.name || "Empresa";
    }

    // Re-emitir JWT assinado com o novo contexto de tenant
    const { token, expiresAt } = await signSessionToken({
      sub: session.userId,
      email: session.email || "",
      role: newRole,
      tenantId,
      scope: session.role === "PLATFORM_SUPERADMIN" ? "CONFIDENTIAL" : "TENANT",
    });

    const response = NextResponse.json({
      success: true,
      message: `Empresa activa cambiada a "${tenantName}".`,
      activeTenantId: tenantId,
      role: newRole,
      token,
      expiresAt,
    });

    response.cookies.set("bioaudit_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    response.cookies.set("bioaudit_active_tenant", tenantId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
