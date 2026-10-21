import { NextResponse } from "next/server";
import { SupabaseTenantRepository } from "@/infrastructure/database/supabase/repositories/supabase-tenant.repository";
import { ensureSuperAdmin } from "@/infrastructure/database/supabase/supabase-server";

const tenantRepo = new SupabaseTenantRepository();

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

    if (body.status) {
      await tenantRepo.updateStatus(id, body.status);
    }

    if (body.maxUserSeats !== undefined) {
      await tenantRepo.updateSubscriptionSeats(id, Number(body.maxUserSeats));
    }

    if (body.expiresAt) {
      await tenantRepo.updateSubscriptionExpiration(id, new Date(body.expiresAt));
    }

    const updated = await tenantRepo.findById(id);

    return NextResponse.json({
      success: true,
      message: "Configurações da empresa atualizadas com sucesso.",
      tenant: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
