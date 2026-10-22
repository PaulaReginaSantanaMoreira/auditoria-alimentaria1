import { NextRequest, NextResponse } from "next/server";
import { resolveSessionAndRole } from "@/infrastructure/security/session-resolver";
import { hasPermission } from "@/domain/security/roles-and-permissions";
import { TenantRepository } from "@/infrastructure/database/repositories/tenant.repository";

const tenantRepo = new TenantRepository();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    const { userId } = await params;

    const result = await tenantRepo.resetUserPassword(session.tenantId, userId);

    return NextResponse.json({
      success: true,
      message: "Contraseña temporal regenerada con éxito.",
      temporaryPassword: result.temporaryPassword,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al restablecer la contraseña." },
      { status: 500 }
    );
  }
}
