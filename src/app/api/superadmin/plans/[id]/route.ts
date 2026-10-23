import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";
import { resolveSessionAndRole } from "@/infrastructure/security/session-resolver";
import { SubscriptionPlanRepository } from "@/infrastructure/database/repositories/subscription-plan.repository";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveSessionAndRole(req);
    if (session.role !== "PLATFORM_SUPERADMIN" && process.env.NEXT_PUBLIC_APP_MODE !== "demo") {
      return NextResponse.json(
        { error: "Acceso denegado: solo el SuperAdmin puede modificar planes." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const supabase = await createServerSupabaseClient();
    const repo = new SubscriptionPlanRepository(supabase);

    const plan = await repo.findById(id);
    if (!plan) {
      return NextResponse.json(
        { error: "Plan de suscripción no encontrado." },
        { status: 404 }
      );
    }

    plan.update({
      name: body.name,
      description: body.description,
      durationDays: body.durationDays !== undefined ? Number(body.durationDays) : undefined,
      maxUserSeats: body.maxUserSeats !== undefined ? Number(body.maxUserSeats) : undefined,
      price: body.price !== undefined ? Number(body.price) : undefined,
      currency: body.currency,
      isDefault: body.isDefault !== undefined ? Boolean(body.isDefault) : undefined,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
    });

    await repo.save(plan);

    return NextResponse.json(
      {
        success: true,
        message: `Plan "${plan.name}" actualizado con éxito.`,
        plan: plan.toJSON(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar el plan" },
      { status: 400 }
    );
  }
}
