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
    const { id } = await params;
    const item = await tenantRepo.findById(id);

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Empresa não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: item.tenant.id,
        name: item.tenant.name,
        cif: item.tenant.cif,
        slug: item.tenant.slug,
        status: item.tenant.status,
        address: item.tenant.address || "",
        phone: item.tenant.phone || "",
        adminEmail: item.tenant.adminEmail || "",
        adminName: item.tenant.adminName || "",
        planTier: item.subscription.planTier,
        maxUserSeats: item.subscription.maxUserSeats,
        activeUsersCount: item.activeUsersCount,
        validFrom: item.subscription.validFrom.toISOString(),
        expiresAt: item.subscription.expiresAt.toISOString(),
        daysRemaining: item.subscription.getDaysRemaining(),
        isExpired: item.subscription.isExpired(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSuperAdmin();
    const { id } = await params;
    const body = await request.json();

    // Regra de Governança: O documento oficial (CIF) é estritamente inalterável
    const existing = await tenantRepo.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Empresa no encontrada" },
        { status: 404 }
      );
    }

    if (body.cif && body.cif.trim().toUpperCase() !== existing.tenant.cif) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El documento oficial (CIF/NIF) es inmutable por razones de conformidad regulatoria y trazabilidad jurídica. Todos los demás campos de la empresa son editables.",
        },
        { status: 400 }
      );
    }

    if (body.status) {
      await tenantRepo.updateStatus(id, body.status);
    }

    if (body.planTier) {
      await tenantRepo.updatePlanTier(id, body.planTier);
    }

    if (body.maxUserSeats !== undefined) {
      await tenantRepo.updateSubscriptionSeats(id, Number(body.maxUserSeats));
    }

    if (body.expiresAt) {
      await tenantRepo.updateSubscriptionExpiration(id, new Date(body.expiresAt));
    }

    if (
      body.name !== undefined ||
      body.address !== undefined ||
      body.phone !== undefined ||
      body.adminEmail !== undefined ||
      body.adminName !== undefined
    ) {
      await tenantRepo.updateTenantDetails(id, {
        name: body.name,
        address: body.address,
        phone: body.phone,
        adminEmail: body.adminEmail,
        adminName: body.adminName,
      });
    }

    const updated = await tenantRepo.findById(id);

    return NextResponse.json({
      success: true,
      message: "Configurações da empresa atualizadas com sucesso.",
      tenant: updated ? {
        id: updated.tenant.id,
        name: updated.tenant.name,
        cif: updated.tenant.cif,
        slug: updated.tenant.slug,
        status: updated.tenant.status,
        address: updated.tenant.address || "",
        phone: updated.tenant.phone || "",
        adminEmail: updated.tenant.adminEmail || "",
        adminName: updated.tenant.adminName || "",
        maxUserSeats: updated.subscription.maxUserSeats,
        subscriptionStatus: updated.subscription.status,
        expiresAt: updated.subscription.expiresAt.toISOString(),
      } : null,
    });
  } catch (error: any) {
    console.error("Erro no PATCH de tenant:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSuperAdmin();
    const { id } = await params;

    const existing = await tenantRepo.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Empresa no encontrada." },
        { status: 404 }
      );
    }

    await tenantRepo.delete(id);

    return NextResponse.json({
      success: true,
      message: `Empresa "${existing.tenant.name}" y sus configuraciones asociadas eliminadas con éxito.`,
    });
  } catch (error: any) {
    console.error("Erro ao deletar tenant:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar la empresa." },
      { status: 500 }
    );
  }
}
