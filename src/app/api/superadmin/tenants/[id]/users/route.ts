import { NextResponse } from "next/server";
import { TenantRepository } from "@/infrastructure/database/repositories/tenant.repository";
import { ensureSuperAdmin } from "@/infrastructure/database/supabase/supabase-server";

const tenantRepo = new TenantRepository();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSuperAdmin();
    const { id: tenantId } = await params;

    const users = await tenantRepo.getTenantUsers(tenantId);

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar usuários do tenant" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSuperAdmin();
    const { id: tenantId } = await params;
    const body = await request.json();

    const { email, fullName, role, temporaryPassword, phone, documentNumber, canViewAllTenantAudits } = body;

    if (!email || !fullName) {
      return NextResponse.json(
        { success: false, error: "Nome completo e e-mail corporativo são obrigatórios." },
        { status: 400 }
      );
    }

    // REGRA DE SEGURANÇA MANDATÓRIA:
    // Nenhum usuário vinculado a tenant poderá ter perfil de superadmin.
    const normalizedRole = String(role || "AUDITOR").toUpperCase();
    if (
      normalizedRole.includes("SUPERADMIN") ||
      normalizedRole === "PLATFORM_SUPERADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "VIOLAÇÃO DE SEGURANÇA: Nenhum usuário vinculado a empresa/tenant pode possuir perfil de SuperAdministrador.",
        },
        { status: 400 }
      );
    }

    // Papéis válidos permitidos para tenant users
    const validRoles = ["TENANT_ADMIN", "AUDITOR", "INSPECTOR", "VIEWER"];
    const assignedRole = validRoles.includes(normalizedRole)
      ? (normalizedRole as "TENANT_ADMIN" | "AUDITOR" | "INSPECTOR" | "VIEWER")
      : "AUDITOR";

    const result = await tenantRepo.createTenantUser({
      tenantId,
      email,
      fullName,
      phone: phone ? String(phone).trim() : undefined,
      documentNumber: documentNumber ? String(documentNumber).trim() : undefined,
      role: assignedRole,
      temporaryPassword,
      canViewAllTenantAudits:
        typeof canViewAllTenantAudits === "boolean"
          ? canViewAllTenantAudits
          : assignedRole === "TENANT_ADMIN",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Usuário cadastrado com sucesso no tenant.",
        user: result.user,
        temporaryPassword: result.temporaryPassword,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao cadastrar usuário no tenant" },
      { status: 500 }
    );
  }
}
