import { NextResponse } from "next/server";
import { TenantRepository } from "@/infrastructure/database/repositories/tenant.repository";
import { ensureSuperAdmin } from "@/infrastructure/database/supabase/supabase-server";

const tenantRepo = new TenantRepository();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    await ensureSuperAdmin();
    const { id: tenantId, userId } = await params;
    const body = await request.json();

    const { fullName, role, isActive } = body;

    // REGRA DE SEGURANÇA MANDATÓRIA:
    // Nenhum usuário vinculado a tenant poderá ter perfil de superadmin.
    if (role) {
      const normalizedRole = String(role).toUpperCase();
      if (
        normalizedRole.includes("SUPERADMIN") ||
        normalizedRole === "PLATFORM_SUPERADMIN"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "VIOLAÇÃO DE SEGURANÇA: Nenhum usuário vinculado a empresa/tenant pode possuir perfil de SuperAdministrador.",
          },
          { status: 400 }
        );
      }
    }

    const updatedUser = await tenantRepo.updateTenantUser({
      tenantId,
      userId,
      fullName: fullName !== undefined ? String(fullName).trim() : undefined,
      role: role !== undefined ? role : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Inspector / Usuario actualizado con éxito.",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar inspector do tenant:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar usuário do tenant" },
      { status: 500 }
    );
  }
}
