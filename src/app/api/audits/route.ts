import { NextRequest, NextResponse } from "next/server";
import { CreateAuditUseCase } from "@/application/use-cases/create-audit.use-case";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";
import { AuditRepository } from "@/infrastructure/database/repositories/audit.repository";
import { CompanyRepository } from "@/infrastructure/database/repositories/company.repository";
import {
  AuditAccessScope,
  hasPermission,
  canAccessAuditScope,
} from "@/domain/security/roles-and-permissions";
import { resolveSessionAndRole } from "@/infrastructure/security/session-resolver";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = await createServerSupabaseClient();
    const { role: callerRole } = await resolveSessionAndRole(req);

    // Se quem cria for PLATFORM_SUPERADMIN, o escopo da auditoria é CONFIDENTIAL por padrão
    let accessScope: AuditAccessScope = "TENANT";
    let tenantId = body.tenantId || null;

    if (hasPermission(callerRole, "audit:read_confidential") || body.accessScope === "CONFIDENTIAL") {
      accessScope = "CONFIDENTIAL";
      if (tenantId === "global" || !tenantId) {
        tenantId = null; // Independente de empresa (Plataforma Global)
      }
    } else if (body.accessScope === "PRIVATE") {
      accessScope = "PRIVATE";
    }

    const auditRepo = new AuditRepository(supabase);
    const companyRepo = new CompanyRepository(supabase);
    const useCase = new CreateAuditUseCase(auditRepo, companyRepo);

    const result = await useCase.execute({
      ...body,
      tenantId,
      accessScope,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao criar auditoria" },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const auditorId = searchParams.get("auditorId");
    const adminOnly = searchParams.get("adminOnly") === "true";
    const scopeParam = searchParams.get("scope") as AuditAccessScope | null;

    const session = await resolveSessionAndRole(req);
    const callerRole = session.role;

    // Se solicitou inspeções confidenciais/privadas do administrador
    if (adminOnly || scopeParam === "CONFIDENTIAL") {
      if (!hasPermission(callerRole, "audit:read_confidential") && process.env.NEXT_PUBLIC_APP_MODE !== "demo") {
        return NextResponse.json(
          {
            error:
              "Acceso denegado: Su perfil de acceso no dispone de permisos para consultar inspecciones confidenciales.",
          },
          { status: 403 }
        );
      }

      let adminAudits: any[] | null = null;
      let queryError: any = null;

      const primaryQuery = await supabase
        .from("audits")
        .select(
          "id, inspection_date, status, normative_framework, compliance_score, verdict, access_scope, created_at, company:companies(name, cif)"
        )
        .eq("access_scope", "CONFIDENTIAL")
        .order("created_at", { ascending: false });

      if (primaryQuery.error && primaryQuery.error.message?.includes("access_scope")) {
        // Fallback gracioso se a coluna ainda não foi aplicada fisicamente no banco remoto
        const fallback = await supabase
          .from("audits")
          .select(
            "id, inspection_date, status, normative_framework, compliance_score, verdict, created_at, company:companies(name, cif)"
          )
          .order("created_at", { ascending: false });
        adminAudits = fallback.data;
        queryError = fallback.error;
      } else {
        adminAudits = primaryQuery.data;
        queryError = primaryQuery.error;
      }

      if (queryError) {
        return NextResponse.json([], { status: 200 });
      }

      return NextResponse.json(adminAudits || [], { status: 200 });
    }

    const auditRepo = new AuditRepository(supabase);

    // Se houver empresa (tenant) ativa no contexto da sessão
    if (session.tenantId && session.role !== "PLATFORM_SUPERADMIN") {
      let canViewAll = callerRole === "TENANT_ADMIN" || callerRole === "VIEWER";

      if (callerRole === "AUDITOR" && session.userId) {
        const { data: member } = await supabase
          .from("tenant_users")
          .select("can_view_all_tenant_audits")
          .eq("user_id", session.userId)
          .eq("tenant_id", session.tenantId)
          .maybeSingle();

        canViewAll = Boolean(member?.can_view_all_tenant_audits);
      }

      // Regra de Invalidação:
      // AUDITOR e VIEWER nunca visualizam auditorias anuladas/invalidadas.
      // Apenas TENANT_ADMIN e SUPERADMIN podem vê-las.
      const shouldExcludeInvalidated = callerRole === "AUDITOR" || callerRole === "VIEWER";

      const tenantAudits = await auditRepo.findByTenantId(session.tenantId, {
        excludeInvalidated: shouldExcludeInvalidated,
        auditorId: canViewAll ? undefined : session.userId,
      });

      return NextResponse.json(tenantAudits, { status: 200 });
    }

    // Fallback legado ou auditoria individual direta
    const targetAuditorId = auditorId || session.userId || "default-auditor";
    const audits = await auditRepo.findByAuditorId(targetAuditorId);

    // Filtra pelo modelo de governança de escopos autorizados e oculta invalidadas de inspetores comuns
    const authorizedAudits = audits.filter((audit) => {
      if (!canAccessAuditScope(callerRole, audit.accessScope)) return false;
      if ((callerRole === "AUDITOR" || callerRole === "VIEWER") && audit.status === "INVALIDATED") {
        return false;
      }
      return true;
    });

    return NextResponse.json(authorizedAudits, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao listar auditorias" },
      { status: 500 }
    );
  }
}
