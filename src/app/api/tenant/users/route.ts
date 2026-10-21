import { NextResponse } from "next/server";
import { createAdminClient } from "@/infrastructure/database/supabase/supabase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "Parâmetro tenantId é obrigatório" },
        { status: 400 }
      );
    }

    const client = createAdminClient();

    // 1. Obter subscrição e limite de assentos
    const { data: sub } = await client
      .from("tenant_subscriptions")
      .select("max_user_seats, status, expires_at")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const maxSeats = sub?.max_user_seats ?? 5;

    // 2. Obter usuários do tenant
    const { data: users, error: usersError } = await client
      .from("tenant_users")
      .select(`
        id,
        user_id,
        role,
        can_view_all_tenant_audits,
        is_active,
        created_at
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (usersError) {
      return NextResponse.json({ success: false, error: usersError.message }, { status: 500 });
    }

    const activeCount = (users || []).filter((u: any) => u.is_active).length;

    return NextResponse.json({
      success: true,
      maxSeats,
      activeCount,
      availableSeats: Math.max(0, maxSeats - activeCount),
      subscriptionStatus: sub?.status ?? "ACTIVE",
      expiresAt: sub?.expires_at,
      users: users || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, canViewAllTenantAudits, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do membro é obrigatório" },
        { status: 400 }
      );
    }

    const client = createAdminClient();

    const updates: any = { updated_at: new Date().toISOString() };
    if (canViewAllTenantAudits !== undefined) {
      updates.can_view_all_tenant_audits = Boolean(canViewAllTenantAudits);
    }
    if (isActive !== undefined) {
      updates.is_active = Boolean(isActive);
    }

    const { data, error } = await client
      .from("tenant_users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Permissões do usuário atualizadas com sucesso.",
      user: data,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
