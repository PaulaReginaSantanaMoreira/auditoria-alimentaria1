import { NextResponse } from "next/server";
import { TenantRepository } from "@/infrastructure/database/repositories/tenant.repository";
import { ensureSuperAdmin } from "@/infrastructure/database/supabase/supabase-server";

const tenantRepo = new TenantRepository();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    await ensureSuperAdmin();
    const { id: tenantId, userId } = await params;
    const body = await request.json().catch(() => ({}));

    const result = await tenantRepo.resetUserPassword(
      tenantId,
      userId,
      body.newPassword
    );

    return NextResponse.json({
      success: true,
      message: "Senha do usuário resetada com sucesso.",
      temporaryPassword: result.temporaryPassword,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao resetar senha do usuário" },
      { status: 500 }
    );
  }
}
