import { NextResponse } from "next/server";
import { SupabaseTenantRepository } from "@/infrastructure/database/supabase/repositories/supabase-tenant.repository";
import { ensureSuperAdmin } from "@/infrastructure/database/supabase/supabase-server";

const tenantRepo = new SupabaseTenantRepository();

export async function GET() {
  try {
    await ensureSuperAdmin();
    const list = await tenantRepo.findAll();

    const formatted = list.map((item) => ({
      id: item.tenant.id,
      name: item.tenant.name,
      cif: item.tenant.cif,
      slug: item.tenant.slug,
      status: item.tenant.status,
      planTier: item.subscription.planTier,
      maxUserSeats: item.subscription.maxUserSeats,
      activeUsersCount: item.activeUsersCount,
      subscriptionStatus: item.subscription.status,
      validFrom: item.subscription.validFrom.toISOString(),
      expiresAt: item.subscription.expiresAt.toISOString(),
      daysRemaining: item.subscription.getDaysRemaining(),
      isExpired: item.subscription.isExpired(),
      createdAt: item.tenant.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, tenants: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar empresas" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSuperAdmin();
    const body = await request.json();

    if (!body.name || !body.cif) {
      return NextResponse.json(
        { success: false, error: "Nome e CIF da empresa são obrigatórios." },
        { status: 400 }
      );
    }

    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    const created = await tenantRepo.create({
      name: body.name,
      cif: body.cif,
      slug,
      planTier: body.planTier || "PRO",
      maxUserSeats: Number(body.maxUserSeats) || 5,
      subscriptionDays: Number(body.subscriptionDays) || 365,
    });

    return NextResponse.json({
      success: true,
      tenant: {
        id: created.tenant.id,
        name: created.tenant.name,
        cif: created.tenant.cif,
        slug: created.tenant.slug,
        status: created.tenant.status,
        maxUserSeats: created.subscription.maxUserSeats,
        expiresAt: created.subscription.expiresAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao criar empresa/tenant" },
      { status: 500 }
    );
  }
}
