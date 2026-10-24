import { NextRequest, NextResponse } from "next/server";
import { RubricRepository } from "@/infrastructure/database/repositories/rubric.repository";
import { resolveSessionAndRole } from "@/infrastructure/security/session-resolver";
import { createAdminClient } from "@/infrastructure/database/supabase/supabase-admin";
import { ControlPointSorterService } from "@/domain/services/control-point-sorter.service";

const rubricRepo = new RubricRepository();

export async function GET(req: NextRequest) {
  try {
    const session = await resolveSessionAndRole(req);
    const { searchParams } = new URL(req.url);
    const auditId = searchParams.get("auditId");
    let tenantId = searchParams.get("tenantId") || session.tenantId;

    let auditStatus: string | null = null;
    let existingEvalsMap: Record<string, any> = {};

    if (auditId) {
      try {
        const client = createAdminClient();
        const { data: audit } = await client
          .from("audits")
          .select("tenant_id, status")
          .eq("id", auditId)
          .maybeSingle();

        if (audit) {
          auditStatus = audit.status;
          if (audit.tenant_id) {
            tenantId = audit.tenant_id;
          }
        }

        const { data: existingEvals } = await client
          .from("audit_evaluations")
          .select("control_point_code, category, title, is_critical_ccp, score, observations, evidence_photo_url")
          .eq("audit_id", auditId);

        if (existingEvals && existingEvals.length > 0) {
          existingEvalsMap = existingEvals.reduce((acc: any, cur: any) => {
            acc[cur.control_point_code] = {
              score: cur.score,
              observations: cur.observations || "",
              photoUrl: cur.evidence_photo_url,
            };
            return acc;
          }, {});

          // APENAS se a auditoria já estiver legalmente FINALIZADA ou ASSINADA, congelamos a estrutura histórica
          if (auditStatus === "FINALIZED" || auditStatus === "SIGNED") {
            const rawTemplates = existingEvals.map((ev: any) => ({
              code: ev.control_point_code,
              category: ev.category,
              categoryLabel:
                ev.category === "INFRAESTRUCTURA"
                  ? "Infraestructura"
                  : ev.category === "HIGIENE_PERSONAL"
                  ? "Higiene Personal"
                  : "APPCC / Frío",
              number: ev.control_point_code.replace(/^q/, "").replace(/_/g, "."),
              title: ev.title,
              isCriticalCcp: Boolean(ev.is_critical_ccp),
              legalReference: "Reglamento (CE) 852/2004",
              isActive: true,
            }));

            const sortedTemplates = ControlPointSorterService.sortNaturally(rawTemplates);

            return NextResponse.json({
              success: true,
              rubric: {
                tenantId: tenantId || null,
                isCustomized: true,
                totalPoints: sortedTemplates.length,
                criticalCcpCount: sortedTemplates.filter((p: any) => p.isCriticalCcp).length,
                templates: sortedTemplates,
              },
              evaluations: existingEvalsMap,
            });
          }
        }
      } catch {
        // Fallback para obtenção de rúbrica do tenant
      }
    }

    // Para auditorias novas ou em andamento (IN_PROGRESS / DRAFT), carregar a rúbrica ativa do tenant
    const effectiveTenantId = tenantId && tenantId !== "global" ? tenantId : null;
    const info = await rubricRepo.getRubricForTenant(effectiveTenantId, false);

    const sortedTemplates = ControlPointSorterService.sortNaturally(info.templates);

    return NextResponse.json({
      success: true,
      rubric: {
        ...info,
        templates: sortedTemplates,
      },
      evaluations: existingEvalsMap,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
