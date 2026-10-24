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
        planId: c.planId,
        planName: c.planName,
        planCode: c.planCode,
        actionType: c.actionType,
        validFrom: c.validFrom.toISOString(),
        expiresAt: c.expiresAt.toISOString(),
        paymentDueDate: c.paymentDueDate ? c.paymentDueDate.toISOString() : undefined,
        isOfferExpired: c.isOfferExpired(),
        daysAdded: c.daysAdded,
        seats: c.seats,
        paymentStatus: c.paymentStatus,
        amount: c.amount,
        refundAmount: c.refundAmount,
        refundType: c.refundType,
        refundReason: c.refundReason,
        refundedAt: c.refundedAt ? c.refundedAt.toISOString() : undefined,
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
      planId: body.planId,
      planName: body.planName,
      planCode: body.planCode,
      daysToAdd: body.daysToAdd !== undefined ? Number(body.daysToAdd) : undefined,
      newExpiresAt: body.newExpiresAt ? new Date(body.newExpiresAt) : undefined,
      newSeats: body.newSeats !== undefined ? Number(body.newSeats) : undefined,
      paymentStatus: body.paymentStatus,
      paymentDueDate: body.paymentDueDate ? new Date(body.paymentDueDate) : undefined,
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
        paymentDueDate: result.subscription.paymentDueDate ? result.subscription.paymentDueDate.toISOString() : null,
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
        paymentDueDate: result.contract.paymentDueDate ? result.contract.paymentDueDate.toISOString() : null,
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSuperAdmin();
    const { id } = await params;
    const body = await request.json();

    const { contractId, action } = body;
    if (!contractId) {
      return NextResponse.json(
        { success: false, error: "contractId es obligatorio." },
        { status: 400 }
      );
    }

    if (action === "CONFIRM_PAYMENT") {
      const result = await tenantRepo.confirmContractPayment(id, contractId);
      return NextResponse.json({
        success: true,
        message: "Pago confirmado y suscripción activada con éxito.",
        subscription: {
          id: result.subscription.id,
          planName: result.subscription.planName,
          status: result.subscription.status,
          paymentStatus: result.subscription.paymentStatus,
          expiresAt: result.subscription.expiresAt.toISOString(),
          isExpired: result.subscription.isExpired(),
        },
      });
    }

    if (action === "CANCEL_OFFER" || action === "CANCEL_CONTRACT" || action === "CANCEL_COURTESY") {
      const { reason } = body;
      const result = await tenantRepo.cancelContract({
        tenantId: id,
        contractId,
        reason: reason ? String(reason) : "Anulación de contrato o bonificación",
      });
      return NextResponse.json({
        success: true,
        message: "Contrato / Bonificación anulada con éxito y vigencia recalculada.",
        subscription: {
          id: result.subscription.id,
          status: result.subscription.status,
          paymentStatus: result.subscription.paymentStatus,
          expiresAt: result.subscription.expiresAt.toISOString(),
          daysRemaining: result.subscription.getDaysRemaining(),
          isExpired: result.subscription.isExpired(),
        },
      });
    }

    if (action === "REFUND") {
      const { refundType, refundAmount, refundReason, revokeAccess } = body;
      if (!refundType || !refundAmount || !refundReason) {
        return NextResponse.json(
          { success: false, error: "El tipo de reembolso, importe y motivo son obligatorios." },
          { status: 400 }
        );
      }

      const result = await tenantRepo.refundContract({
        tenantId: id,
        contractId,
        refundType,
        refundAmount: Number(refundAmount),
        refundReason: String(refundReason),
        revokeAccess: Boolean(revokeAccess),
      });

      return NextResponse.json({
        success: true,
        message: "Reembolso procesado con éxito.",
        subscription: {
          id: result.subscription.id,
          status: result.subscription.status,
          paymentStatus: result.subscription.paymentStatus,
          expiresAt: result.subscription.expiresAt.toISOString(),
          isExpired: result.subscription.isExpired(),
        },
        contract: {
          id: result.contract.id,
          paymentStatus: result.contract.paymentStatus,
          refundAmount: result.contract.refundAmount,
          refundType: result.contract.refundType,
          refundReason: result.contract.refundReason,
          refundedAt: result.contract.refundedAt ? result.contract.refundedAt.toISOString() : null,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Acción no reconocida." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error al actualizar contrato:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar contrato" },
      { status: 500 }
    );
  }
}
