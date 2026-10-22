import { NextResponse } from "next/server";
import { TenantRepository } from "@/infrastructure/database/repositories/tenant.repository";
import { ensureSuperAdmin } from "@/infrastructure/database/supabase/supabase-server";

const tenantRepo = new TenantRepository();

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
      address: item.tenant.address || "",
      phone: item.tenant.phone || "",
      adminEmail: item.tenant.adminEmail || "",
      adminName: item.tenant.adminName || "",
      planTier: item.subscription.planTier,
      maxUserSeats: item.subscription.maxUserSeats,
      activeUsersCount: item.activeUsersCount,
      subscriptionStatus: item.subscription.status,
      paymentStatus: item.subscription.paymentStatus || "PAID",
      invoiceRef: item.subscription.invoiceRef || "",
      notes: item.subscription.notes || "",
      validFrom: item.subscription.validFrom.toISOString(),
      expiresAt: item.subscription.expiresAt.toISOString(),
      daysRemaining: item.subscription.getDaysRemaining(),
      isExpired: item.subscription.isExpired(),
      createdAt: item.tenant.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, tenants: formatted });
  } catch (error: any) {
    console.error("[GET /api/superadmin/tenants] Error:", error);
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
      address: body.address,
      phone: body.phone,
      adminEmail: body.adminEmail,
      adminName: body.adminName,
      temporaryPassword: body.temporaryPassword,
      paymentStatus: body.paymentStatus || "PAID",
      invoiceRef: body.invoiceRef,
      notes: body.notes,
    });

    return NextResponse.json(
      {
        success: true,
        tenant: {
          id: created.tenant.id,
          name: created.tenant.name,
          cif: created.tenant.cif,
          slug: created.tenant.slug,
          status: created.tenant.status,
          address: created.tenant.address || "",
          phone: created.tenant.phone || "",
          adminEmail: created.tenant.adminEmail || "",
          adminName: created.tenant.adminName || "",
          maxUserSeats: created.subscription.maxUserSeats,
          paymentStatus: created.subscription.paymentStatus,
          expiresAt: created.subscription.expiresAt.toISOString(),
        },
        adminTempPassword: created.adminTempPassword,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao criar empresa/tenant" },
      { status: 500 }
    );
  }
}
