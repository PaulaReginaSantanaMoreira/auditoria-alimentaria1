import { NextResponse } from "next/server";
import { TenantRepository } from "@/infrastructure/database/repositories/tenant.repository";
import { ensureSuperAdmin } from "@/infrastructure/database/supabase/supabase-server";
import { Cif } from "@/domain/value-objects/cif";

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
      planId: item.subscription?.planId ?? null,
      planName: item.subscription?.planName ?? null,
      planCode: item.subscription?.planCode ?? null,
      planTier: item.subscription?.planName ?? null, // mantido para compatibilidade
      maxUserSeats: item.subscription?.maxUserSeats ?? null,
      activeUsersCount: item.activeUsersCount,
      subscriptionStatus: item.subscription?.status ?? null,
      paymentStatus: item.subscription?.paymentStatus ?? null,
      invoiceRef: item.subscription?.invoiceRef || "",
      notes: item.subscription?.notes || "",
      validFrom: item.subscription?.validFrom ? item.subscription.validFrom.toISOString() : null,
      expiresAt: item.subscription?.expiresAt ? item.subscription.expiresAt.toISOString() : null,
      daysRemaining: item.subscription ? item.subscription.getDaysRemaining() : null,
      isExpired: item.subscription ? item.subscription.isExpired() : null,
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

    // 1. Validação de Razón Social
    const name = (body.name || "").trim();
    if (!name || name.length < 3) {
      return NextResponse.json(
        { success: false, error: "La razón social de la empresa es obligatoria y debe tener al menos 3 caracteres." },
        { status: 400 }
      );
    }

    // 2. Validação Estrita de Documento Oficial (CIF / NIF / NIE)
    const rawCif = (body.cif || "").trim().toUpperCase().replace(/[\s-]/g, "");
    if (!Cif.isValid(rawCif)) {
      return NextResponse.json(
        {
          success: false,
          error: `El documento fiscal CIF/NIF "${body.cif}" no tiene un formato válido oficial en España (debe constar de 9 caracteres alfanuméricos, ej. B84920194, 12345678Z o X1234567Z).`,
        },
        { status: 400 }
      );
    }

    // 3. Prevenção de Duplicidade por CIF
    const existingTenant = await tenantRepo.findByCif(rawCif);
    if (existingTenant) {
      return NextResponse.json(
        {
          success: false,
          error: `Ya existe una empresa registrada en la plataforma con el CIF/NIF ${rawCif} ("${existingTenant.tenant.name}").`,
        },
        { status: 409 }
      );
    }

    // 4. Validação de Telefone de Contato (se fornecido)
    const phone = body.phone ? String(body.phone).trim() : "";
    if (phone) {
      const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{5,15}$/;
      if (!phoneRegex.test(phone)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "El formato del teléfono de contacto no es válido. Solo debe contener números, espacios y prefijo internacional (ej. +34 912 345 678).",
          },
          { status: 400 }
        );
      }
    }

    // 5. Validação de Administrador Inicial
    const adminEmail = body.adminEmail ? String(body.adminEmail).trim().toLowerCase() : "";
    const adminName = body.adminName ? String(body.adminName).trim() : "";
    if (adminEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminEmail)) {
        return NextResponse.json(
          { success: false, error: "El correo electrónico del administrador no tiene un formato válido." },
          { status: 400 }
        );
      }
      if (!adminName) {
        return NextResponse.json(
          {
            success: false,
            error: "Debe ingresar el nombre del administrador para vincular su cuenta de acceso.",
          },
          { status: 400 }
        );
      }
    }

    const adminPhone = body.adminPhone ? String(body.adminPhone).trim() : phone;
    const adminDocumentNumber = body.adminDocumentNumber ? String(body.adminDocumentNumber).trim().toUpperCase() : undefined;

    // 6. Vigência, Cupo e Plano de Assinatura
    const planId = body.planId ? String(body.planId).trim() : undefined;
    const subscriptionDays = body.subscriptionDays ? Number(body.subscriptionDays) : undefined;
    const maxUserSeats = body.maxUserSeats ? Number(body.maxUserSeats) : undefined;

    const validPaymentStatuses = ["PAID", "COURTESY", "PENDING_PAYMENT"];
    const paymentStatus = validPaymentStatuses.includes(body.paymentStatus)
      ? body.paymentStatus
      : undefined;

    const slug =
      body.slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");

    const created = await tenantRepo.create({
      name,
      cif: rawCif,
      slug,
      planId,
      planName: body.planName,
      planCode: body.planCode,
      planTier: body.planTier,
      maxUserSeats,
      subscriptionDays,
      address: body.address ? String(body.address).trim() : "",
      phone,
      adminEmail,
      adminName,
      adminPhone,
      adminDocumentNumber,
      temporaryPassword: body.temporaryPassword,
      paymentStatus,
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
          planId: created.subscription?.planId ?? null,
          planName: created.subscription?.planName ?? null,
          planCode: created.subscription?.planCode ?? null,
          maxUserSeats: created.subscription?.maxUserSeats ?? null,
          paymentStatus: created.subscription?.paymentStatus ?? null,
          expiresAt: created.subscription?.expiresAt ? created.subscription.expiresAt.toISOString() : null,
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
