import { NextRequest, NextResponse } from "next/server";
import { resolveSessionAndRole } from "@/infrastructure/security/session-resolver";
import { hasPermission } from "@/domain/security/roles-and-permissions";
import { TenantRepository } from "@/infrastructure/database/repositories/tenant.repository";
import { createAdminClient } from "@/infrastructure/database/supabase/supabase-admin";

const tenantRepo = new TenantRepository();

export async function GET(request: NextRequest) {
  try {
    const session = await resolveSessionAndRole(request);
    const { searchParams } = new URL(request.url);
    const requestedTenantId = searchParams.get("tenantId");

    const effectiveTenantId =
      session.role === "PLATFORM_SUPERADMIN"
        ? requestedTenantId || session.tenantId
        : session.tenantId;

    if (!effectiveTenantId) {
      return NextResponse.json(
        { success: false, error: "Identificador de empresa no disponible o no autenticado." },
        { status: 401 }
      );
    }

    const client = createAdminClient();

    // 1. Obter subscrição e limite de assentos
    const { data: sub } = await client
      .from("tenant_subscriptions")
      .select("max_user_seats, status, expires_at")
      .eq("tenant_id", effectiveTenantId)
      .maybeSingle();

    const maxSeats = sub?.max_user_seats ?? 5;

    // 2. Obter usuários detalhados do tenant (com nome e e-mail)
    let users = await tenantRepo.getTenantUsers(effectiveTenantId);
    let activeCount = users.filter((u) => u.isActive).length;

    // Regra de Negócio: Se o plano venceu ou reduziu o cupo (ex: de 4 para 1),
    // inativar automaticamente os inspetores que não são o Administrador Principal
    if (activeCount > maxSeats) {
      await tenantRepo.enforceSeatLimitDeactivation(effectiveTenantId, maxSeats);
      users = await tenantRepo.getTenantUsers(effectiveTenantId);
      activeCount = users.filter((u) => u.isActive).length;
    }

    return NextResponse.json({
      success: true,
      maxSeats,
      activeCount,
      availableSeats: Math.max(0, maxSeats - activeCount),
      subscriptionStatus: sub?.status ?? "ACTIVE",
      expiresAt: sub?.expires_at,
      users,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await resolveSessionAndRole(request);
    if (!session.isAuthenticated || !session.tenantId) {
      return NextResponse.json(
        { success: false, error: "No autenticado o sin empresa activa." },
        { status: 401 }
      );
    }

    if (!hasPermission(session.role, "users:manage")) {
      return NextResponse.json(
        { success: false, error: "Acceso denegado: Se requieren permisos de gestión de equipo." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, fullName, role, temporaryPassword, documentNumber, phone } = body;

    if (!email || !fullName) {
      return NextResponse.json(
        { success: false, error: "Nombre completo y correo corporativo son obligatorios." },
        { status: 400 }
      );
    }

    // REGRA DE SEGURANÇA MANDATÓRIA:
    // Proibido conceder perfil SuperAdmin
    const normalizedRole = String(role || "AUDITOR").toUpperCase();
    if (normalizedRole.includes("SUPERADMIN") || normalizedRole === "PLATFORM_SUPERADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "VIOLACIÓN DE SEGURIDAD: Ningún usuario de empresa puede tener perfil de SuperAdministrador.",
        },
        { status: 400 }
      );
    }

    const client = createAdminClient();

    // VALIDAÇÃO ESTRITA DE COTA DE ASSENTOS ATIVOS
    const { data: sub } = await client
      .from("tenant_subscriptions")
      .select("max_user_seats")
      .eq("tenant_id", session.tenantId)
      .maybeSingle();

    const maxSeats = sub?.max_user_seats ?? 5;

    const { data: existingActive, error: countError } = await client
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", session.tenantId)
      .eq("is_active", true);

    const activeCount = existingActive ? existingActive.length : 0;

    if (activeCount >= maxSeats) {
      return NextResponse.json(
        {
          success: false,
          error: `Has alcanzado el límite máximo de ${maxSeats} inspectores activos de tu suscripción. Inactiva a otro miembro del equipo o solicita una ampliación de cupo.`,
        },
        { status: 400 }
      );
    }

    const validRoles = ["TENANT_ADMIN", "AUDITOR", "VIEWER"];
    const assignedRole = validRoles.includes(normalizedRole)
      ? (normalizedRole as "TENANT_ADMIN" | "AUDITOR" | "VIEWER")
      : "AUDITOR";

    const result = await tenantRepo.createTenantUser({
      tenantId: session.tenantId,
      email,
      fullName,
      phone: phone ? String(phone).trim() : undefined,
      documentNumber: documentNumber ? String(documentNumber).trim() : undefined,
      role: assignedRole,
      temporaryPassword,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Inspector registrado con éxito.",
        user: result.user,
        temporaryPassword: result.temporaryPassword,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar miembro del equipo." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await resolveSessionAndRole(request);
    if (!session.isAuthenticated || !session.tenantId) {
      return NextResponse.json(
        { success: false, error: "No autenticado o sin empresa activa." },
        { status: 401 }
      );
    }

    if (!hasPermission(session.role, "users:manage")) {
      return NextResponse.json(
        { success: false, error: "Acceso denegado: Se requieren permisos de gestión de usuarios." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, canViewAllTenantAudits, isActive, role, fullName, phone, documentNumber } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID del miembro del equipo es obligatorio." },
        { status: 400 }
      );
    }

    if (documentNumber !== undefined) {
      return NextResponse.json(
        {
          success: false,
          error:
            "RESTRICCIÓN DE SEGURIDAD: El documento identificativo oficial no puede ser modificado por autoservicio una vez registrado. Contacte a un SuperAdministrador para rectificaciones de identidad.",
        },
        { status: 400 }
      );
    }

    const client = createAdminClient();

    // 1. Verificar se o registro pertence ao tenant ativo
    const { data: currentMember, error: findError } = await client
      .from("tenant_users")
      .select("id, user_id, role, is_active, tenant_id")
      .eq("id", id)
      .eq("tenant_id", session.tenantId)
      .maybeSingle();

    if (findError || !currentMember) {
      return NextResponse.json(
        { success: false, error: "Miembro no encontrado o no pertenece a su empresa." },
        { status: 404 }
      );
    }

    // REGRA DE SEGURANÇA MANDATÓRIA:
    // Apenas o SuperAdmin pode inativar a conta do Administrador Principal
    if (isActive === false && currentMember.role === "TENANT_ADMIN" && session.role !== "PLATFORM_SUPERADMIN") {
      return NextResponse.json(
        {
          success: false,
          error:
            "RESTRICCIÓN DE SEGURIDAD: Solo un SuperAdministrador de la plataforma puede desactivar la cuenta del Administrador Principal de la empresa.",
        },
        { status: 403 }
      );
    }

    // 2. Se estiver REATIVANDO um usuário inativo (isActive = true), CHECAR COTA!
    if (isActive === true && currentMember.is_active === false) {
      const { data: sub } = await client
        .from("tenant_subscriptions")
        .select("max_user_seats")
        .eq("tenant_id", session.tenantId)
        .maybeSingle();

      const maxSeats = sub?.max_user_seats ?? 5;

      const { data: activeUsers } = await client
        .from("tenant_users")
        .select("id")
        .eq("tenant_id", session.tenantId)
        .eq("is_active", true);

      const activeCount = activeUsers ? activeUsers.length : 0;

      if (activeCount >= maxSeats) {
        return NextResponse.json(
          {
            success: false,
            error: `No es posible reactivar al usuario: se ha alcanzado la cota máxima de ${maxSeats} inspectores activos. Desactive a otro miembro primero o amplíe su suscripción.`,
          },
          { status: 400 }
        );
      }
    }

    // 3. Aplicar alterações em tenant_users
    const updates: any = { updated_at: new Date().toISOString() };
    if (canViewAllTenantAudits !== undefined) {
      updates.can_view_all_tenant_audits = Boolean(canViewAllTenantAudits);
    }
    if (isActive !== undefined) {
      updates.is_active = Boolean(isActive);
    }
    if (role !== undefined) {
      const normalizedRole = String(role).toUpperCase();
      if (!normalizedRole.includes("SUPERADMIN") && ["TENANT_ADMIN", "AUDITOR", "VIEWER"].includes(normalizedRole)) {
        updates.role = normalizedRole;
      }
    }

    const { data: updatedRecord, error: updateError } = await client
      .from("tenant_users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
    }

    // 4. Se informou novo nome ou telefone, atualizar metadados no Supabase Auth
    if ((fullName || phone !== undefined) && currentMember.user_id) {
      try {
        const { data: userAuth } = await client.auth.admin.getUserById(currentMember.user_id);
        const meta = userAuth?.user?.user_metadata || {};
        const newMeta: any = { ...meta };
        if (fullName) newMeta.full_name = fullName.trim();
        if (phone !== undefined) newMeta.phone = String(phone).trim();

        await client.auth.admin.updateUserById(currentMember.user_id, {
          user_metadata: newMeta,
        });
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      success: true,
      message: "Permisos y estado del inspector actualizados con éxito.",
      user: updatedRecord,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
