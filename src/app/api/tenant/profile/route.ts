import { NextRequest, NextResponse } from "next/server";
import { resolveSessionAndRole } from "@/infrastructure/security/session-resolver";
import { hasPermission } from "@/domain/security/roles-and-permissions";
import { TenantRepository } from "@/infrastructure/database/repositories/tenant.repository";

const tenantRepo = new TenantRepository();

export async function GET(req: NextRequest) {
  try {
    const session = await resolveSessionAndRole(req);
    if (!session.isAuthenticated || !session.tenantId) {
      return NextResponse.json(
        { success: false, error: "No autenticado o sin empresa activa seleccionada." },
        { status: 401 }
      );
    }

    const tenant = await tenantRepo.findById(session.tenantId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Empresa no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.tenant.id,
        name: tenant.tenant.name,
        cif: tenant.tenant.cif,
        address: tenant.tenant.address,
        phone: tenant.tenant.phone,
        adminName: tenant.tenant.adminName,
        adminEmail: tenant.tenant.adminEmail,
        planId: tenant.subscription?.planId ?? null,
        planName: tenant.subscription?.planName ?? null,
        planCode: tenant.subscription?.planCode ?? null,
        planTier: tenant.subscription?.planName ?? null,
        maxUserSeats: tenant.subscription?.maxUserSeats ?? null,
        activeUsersCount: tenant.activeUsersCount,
        subscriptionStatus: tenant.subscription?.status ?? null,
        expiresAt: tenant.subscription?.expiresAt ?? null,
        daysRemaining: tenant.subscription ? tenant.subscription.getDaysRemaining() : null,
        isExpired: tenant.subscription ? tenant.subscription.isExpired() : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar perfil de la empresa." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await resolveSessionAndRole(req);
    if (!session.isAuthenticated || !session.tenantId) {
      return NextResponse.json(
        { success: false, error: "No autenticado o sin empresa activa." },
        { status: 401 }
      );
    }

    // Apenas TENANT_ADMIN ou PLATFORM_SUPERADMIN podem alterar dados da empresa
    if (!hasPermission(session.role, "tenant:update_profile")) {
      return NextResponse.json(
        {
          success: false,
          error: "Acceso denegado: Solo el Administrador de la Empresa puede modificar los datos corporativos.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    // REGRA DE DOMÍNIO INEGOCIÁVEL:
    // O documento fiscal (CIF / NIF) é imutável no auto-atendimento do tenant
    if (body.cif !== undefined) {
      const existing = await tenantRepo.findById(session.tenantId);
      if (existing && body.cif.trim().toUpperCase() !== existing.tenant.cif.toUpperCase()) {
        return NextResponse.json(
          {
            success: false,
            error:
              "RESTRICCIÓN LEGAL: El documento oficial (CIF/NIF) es inmutable para preservar la validez jurídica de las auditorías sanitarias emitidas.",
          },
          { status: 400 }
        );
      }
    }

    const { name, address, phone, adminName, adminEmail } = body;

    await tenantRepo.updateTenantDetails(session.tenantId, {
      name,
      address,
      phone,
      adminName,
      adminEmail,
    });

    const updated = await tenantRepo.findById(session.tenantId);

    return NextResponse.json({
      success: true,
      message: "Datos de la empresa actualizados con éxito.",
      tenant: updated?.tenant.toJSON(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar perfil de la empresa." },
      { status: 500 }
    );
  }
}
