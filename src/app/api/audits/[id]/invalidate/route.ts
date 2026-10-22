import { NextRequest, NextResponse } from "next/server";
import { resolveSessionAndRole } from "@/infrastructure/security/session-resolver";
import { hasPermission } from "@/domain/security/roles-and-permissions";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";
import { createAdminClient } from "@/infrastructure/database/supabase/supabase-admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveSessionAndRole(request);
    if (!session.isAuthenticated) {
      return NextResponse.json({ success: false, error: "No autenticado" }, { status: 401 });
    }

    if (!hasPermission(session.role, "audit:invalidate")) {
      return NextResponse.json(
        {
          success: false,
          error: "Acceso denegado: Solo el Administrador de Empresa o SuperAdmin pueden anular inspecciones.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          error: "Es obligatorio registrar una justificación técnica o legal para invalidar la auditoría.",
        },
        { status: 400 }
      );
    }

    const client = createAdminClient();

    // 1. Buscar a auditoria existente
    const { data: audit, error: findError } = await client
      .from("audits")
      .select("id, status, tenant_id, company:companies(name, cif)")
      .eq("id", id)
      .maybeSingle();

    if (findError || !audit) {
      return NextResponse.json({ success: false, error: "Auditoría no encontrada." }, { status: 404 });
    }

    // 2. Se não for SuperAdmin, garantir que a auditoria pertença à empresa ativa
    if (session.role !== "PLATFORM_SUPERADMIN") {
      if (audit.tenant_id && audit.tenant_id !== session.tenantId) {
        return NextResponse.json(
          {
            success: false,
            error: "Acceso denegado: No puedes anular auditorías de otra organización.",
          },
          { status: 403 }
        );
      }
    }

    // 3. Atualizar status para INVALIDATED com metadados de rastreabilidade
    const now = new Date().toISOString();
    const { data: updatedAudit, error: updateError } = await client
      .from("audits")
      .update({
        status: "INVALIDATED",
        invalidated_at: now,
        invalidated_by: session.email || session.userId,
        invalidation_reason: reason,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      // Fallback caso colunas de invalidação ainda não existam no esquema
      const { error: fallbackError } = await client
        .from("audits")
        .update({
          status: "INVALIDATED",
          updated_at: now,
        })
        .eq("id", id);

      if (fallbackError) {
        return NextResponse.json({ success: false, error: fallbackError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Inspección sanitaria ${id} invalidada con éxito.`,
      audit: {
        id,
        status: "INVALIDATED",
        invalidatedAt: now,
        invalidatedBy: session.email,
        invalidationReason: reason,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
