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

    const contracts = await tenantRepo.getSubscriptionContracts(id);

    return NextResponse.json({
      success: true,
      contracts: contracts.map((c) => ({
        id: c.id,
        tenantId: c.tenantId,
        subscriptionId: c.subscriptionId,
        actionType: c.actionType,
        validFrom: c.validFrom.toISOString(),
        expiresAt: c.expiresAt.toISOString(),
        daysAdded: c.daysAdded,
        seats: c.seats,
        paymentStatus: c.paymentStatus,
        amount: c.amount,
        invoiceRef: c.invoiceRef || "",
        notes: c.notes || "",
        createdBy: c.createdBy || "Sistema",
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("Erro ao buscar histórico de contratos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar histórico de contratos" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await ensureSuperAdmin();
    const { id } = await params;
    const body = await request.json();

    if (!body.paymentStatus) {
      return NextResponse.json(
        { success: false, error: "El estado de pago (PAID, COURTESY, PENDING_PAYMENT) es obligatorio." },
        { status: 400 }
      );
    }

    const result = await tenantRepo.renewContract({
      tenantId: id,
      daysToAdd: body.daysToAdd !== undefined ? Number(body.daysToAdd) : undefined,
      newExpiresAt: body.newExpiresAt ? new Date(body.newExpiresAt) : undefined,
      newSeats: body.newSeats !== undefined ? Number(body.newSeats) : undefined,
      paymentStatus: body.paymentStatus,
      amount: body.amount !== undefined && body.amount !== "" ? Number(body.amount) : undefined,
      invoiceRef: body.invoiceRef,
      notes: body.notes,
      createdBy: adminUser?.email || "SuperAdmin",
    });

    return NextResponse.json({
      success: true,
      message: "Contrato / Vigencia renovada con éxito.",
      subscription: {
        id: result.subscription.id,
        planId: result.subscription.planId ?? null,
        planName: result.subscription.planName,
        planCode: result.subscription.planCode,
        planTier: result.subscription.planName,
        maxUserSeats: result.subscription.maxUserSeats,
        status: result.subscription.status,
        paymentStatus: result.subscription.paymentStatus,
        validFrom: result.subscription.validFrom.toISOString(),
        expiresAt: result.subscription.expiresAt.toISOString(),
        daysRemaining: result.subscription.getDaysRemaining(),
        isExpired: result.subscription.isExpired(),
      },
      contract: {
        id: result.contract.id,
        actionType: result.contract.actionType,
        validFrom: result.contract.validFrom.toISOString(),
        expiresAt: result.contract.expiresAt.toISOString(),
        daysAdded: result.contract.daysAdded,
        seats: result.contract.seats,
        paymentStatus: result.contract.paymentStatus,
        amount: result.contract.amount,
        invoiceRef: result.contract.invoiceRef,
        notes: result.contract.notes,
        createdAt: result.contract.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Erro ao renovar contrato de subscrição:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao renovar contrato" },
      { status: 500 }
    );
  }
}
