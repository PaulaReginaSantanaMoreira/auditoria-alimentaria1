import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";
import { resolveSessionAndRole } from "@/infrastructure/security/session-resolver";
import { SubscriptionPlanRepository } from "@/infrastructure/database/repositories/subscription-plan.repository";
import { SubscriptionPlan } from "@/domain/entities/subscription-plan";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const onlyActive = searchParams.get("onlyActive") === "true";

    const repo = new SubscriptionPlanRepository(supabase);
    const plans = await repo.findAll({ onlyActive });

    return NextResponse.json(
      {
        success: true,
        plans: plans.map((p) => p.toJSON()),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al listar los planes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await resolveSessionAndRole(req);
    if (session.role !== "PLATFORM_SUPERADMIN" && process.env.NEXT_PUBLIC_APP_MODE !== "demo") {
      return NextResponse.json(
        { error: "Acceso denegado: solo el SuperAdmin puede crear planes." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      code,
      description,
      durationDays,
      maxUserSeats,
      price,
      currency = "BRL",
      isDefault = false,
      isActive = true,
    } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "El nombre y código del plan son obligatorios." },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const repo = new SubscriptionPlanRepository(supabase);

    const newPlan = new SubscriptionPlan({
      id: crypto.randomUUID(),
      name: String(name),
      code: String(code).toUpperCase().replace(/\s+/g, "_"),
      description: description ? String(description) : undefined,
      durationDays: Number(durationDays) || 30,
      maxUserSeats: Number(maxUserSeats) || 1,
      price: Number(price) >= 0 ? Number(price) : 0,
      currency: String(currency),
      isDefault: Boolean(isDefault),
      isActive: Boolean(isActive),
    });

    await repo.save(newPlan);

    return NextResponse.json(
      {
        success: true,
        message: `Plan "${newPlan.name}" creado con éxito.`,
        plan: newPlan.toJSON(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear el plan" },
      { status: 400 }
    );
  }
}
