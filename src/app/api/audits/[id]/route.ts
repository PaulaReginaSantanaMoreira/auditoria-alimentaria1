import { NextRequest, NextResponse } from "next/server";
import { GetAuditReportUseCase } from "@/application/use-cases/get-audit-report.use-case";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";
import { AuditRepository } from "@/infrastructure/database/repositories/audit.repository";
import { canAccessAuditScope } from "@/domain/security/roles-and-permissions";
import { resolveSessionAndRole } from "@/infrastructure/security/session-resolver";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const auditRepo = new AuditRepository(supabase);
    const useCase = new GetAuditReportUseCase(auditRepo);

    const result = await useCase.execute(id);
    const { role: callerRole } = await resolveSessionAndRole(req);

    // Validação de RBAC sobre o escopo de visibilidade da auditoria
    if (!canAccessAuditScope(callerRole, result.audit.accessScope)) {
      if (process.env.NEXT_PUBLIC_APP_MODE !== "demo") {
        return NextResponse.json(
          {
            error:
              "Acceso denegado: Su perfil de acceso no dispone de permisos para consultar inspecciones bajo este ámbito de confidencialidad.",
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao buscar auditoria" },
      { status: 404 }
    );
  }
}
