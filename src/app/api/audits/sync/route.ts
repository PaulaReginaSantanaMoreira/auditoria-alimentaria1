import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/infrastructure/database/supabase/supabase-server";
import { createAdminClient } from "@/infrastructure/database/supabase/supabase-admin";
import { resolveSessionAndRole } from "@/infrastructure/security/session-resolver";
import { Cif } from "@/domain/value-objects/cif";
import { ComplianceCalculatorService } from "@/domain/services/compliance-calculator.service";
import { DEFAULT_CONTROL_POINTS } from "@/domain/constants/default-control-points";
import { Audit } from "@/domain/entities/audit";
import { Company } from "@/domain/entities/company";
import { Auditor } from "@/domain/entities/auditor";
import { ControlPointEvaluation } from "@/domain/entities/control-point";
import { EvidencePhoto } from "@/domain/value-objects/evidence-photo";
import { RubricRepository } from "@/infrastructure/database/repositories/rubric.repository";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(str?: string | null): boolean {
  return typeof str === "string" && UUID_REGEX.test(str);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "El ID de la auditoría es obligatorio para sincronizar." }, { status: 400 });
    }

    const session = await resolveSessionAndRole(req);
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createServerSupabaseClient();
    }

    // 1. Resolução segura da Empresa (Company)
    const normalizedCif = Cif.createSafe(body.companyCif || "B84920194").value;
    let companyId = crypto.randomUUID();

    try {
      const { data: existingCompany } = await supabase
        .from("companies")
        .select("id")
        .eq("cif", normalizedCif)
        .maybeSingle();

      if (existingCompany?.id) {
        companyId = existingCompany.id;
      } else {
        const { data: newComp } = await supabase
          .from("companies")
          .insert({
            id: companyId,
            name: (body.companyName || "Empresa Auditada").trim(),
            cif: normalizedCif,
            address: (body.companyAddress || "Instalación Operativa").trim(),
            sanitary_registry_number: body.sanitaryRegistryNumber || null,
          })
          .select("id")
          .single();

        if (newComp?.id) {
          companyId = newComp.id;
        }
      }
    } catch (e) {
      console.warn("[sync] Error al asegurar empresa en Supabase:", e);
    }

    // 2. Resolução segura do Auditor (Auditors)
    const effectiveAuditorId = isUuid(session.userId)
      ? (session.userId as string)
      : isUuid(body.auditorId)
      ? (body.auditorId as string)
      : crypto.randomUUID();

    try {
      await supabase.from("auditors").upsert(
        {
          id: effectiveAuditorId,
          full_name: body.auditorSignatureName || session.email || "Auditor Oficial BioAudit",
          official_id: `AUD-${effectiveAuditorId.slice(0, 8).toUpperCase()}`,
          email: session.email || "auditor@sanidad.es",
          is_active_subscription: true,
        },
        { onConflict: "id" }
      );
    } catch (e) {
      console.warn("[sync] Error al asegurar auditor en Supabase:", e);
    }

    // 3. Obter pontos normativos (da auditoria/tenant dinâmico ou padrão)
    const effectiveTenantId =
      body.tenantId && body.tenantId !== "global"
        ? body.tenantId
        : session.tenantId && session.tenantId !== "global"
        ? session.tenantId
        : null;

    let templateList: any[] = DEFAULT_CONTROL_POINTS;
    if (body.controlPoints && Array.isArray(body.controlPoints) && body.controlPoints.length > 0) {
      templateList = body.controlPoints;
    } else {
      try {
        const rubricRepo = new RubricRepository();
        const rubricInfo = await rubricRepo.getRubricForTenant(effectiveTenantId, false);
        if (rubricInfo?.templates && rubricInfo.templates.length > 0) {
          templateList = rubricInfo.templates;
        }
      } catch {
        templateList = DEFAULT_CONTROL_POINTS;
      }
    }

    // 4. Cálculo de laudo e conformidade
    const evaluations: ControlPointEvaluation[] = templateList.map((p: any) => {
      const ev = body.evaluations?.[p.code];
      const score = ev?.score !== undefined ? ev.score : 0;
      return new ControlPointEvaluation({
        code: p.code,
        title: p.title,
        category: p.category,
        isCriticalCcp: p.isCriticalCcp,
        score,
        observations: ev?.observations || "",
        evidencePhoto: ev?.photoUrl || ev?.evidencePhotoBase64 ? new EvidencePhoto({ url: ev.photoUrl || ev.evidencePhotoBase64 }) : undefined,
      });
    });

    const tempAudit = new Audit({
      id: body.id,
      company: new Company({
        id: companyId,
        name: body.companyName || "Empresa Auditada",
        cif: new Cif(normalizedCif),
        address: body.companyAddress || "",
      }),
      auditor: new Auditor({
        id: effectiveAuditorId,
        authUserId: effectiveAuditorId,
        fullName: body.auditorSignatureName || "Auditor Oficial BioAudit",
        officialId: `AUD-${effectiveAuditorId.slice(0, 8).toUpperCase()}`,
        email: session.email || "auditor@sanidad.es",
      }),
      inspectionDate: body.inspectionDate ? new Date(body.inspectionDate) : new Date(),
      normativeFramework: "Reglamento (CE) 852/2004 · APPCC / ISO 22000",
      evaluations,
    });

    const report = ComplianceCalculatorService.calculateReport(tempAudit);
    const isFinalized =
      body.status === "FINALIZED" ||
      Boolean(body.auditorSignatureBase64 && body.auditedSignatureBase64);

    // 5. Upsert da auditoria
    const auditPayload: Record<string, any> = {
      id: body.id,
      company_id: companyId,
      auditor_id: effectiveAuditorId,
      inspection_date: (body.inspectionDate ? new Date(body.inspectionDate) : new Date()).toISOString().split("T")[0],
      status: isFinalized ? "FINALIZED" : body.status || "IN_PROGRESS",
      normative_framework: "Reglamento (CE) 852/2004 · APPCC / ISO 22000",
      compliance_score: report.globalPercentage,
      verdict: report.verdict,
      auditor_signature_name: body.auditorSignatureName || null,
      auditor_signature_url: body.auditorSignatureBase64 || null,
      audited_signature_name: body.auditedSignatureName || null,
      audited_signature_url: body.auditedSignatureBase64 || null,
      access_scope: body.accessScope || "TENANT",
      tenant_id: effectiveTenantId,
      updated_at: new Date().toISOString(),
    };

    let { error: upsertError } = await supabase.from("audits").upsert(auditPayload, { onConflict: "id" });

    if (upsertError && upsertError.message.includes("tenant_id")) {
      delete auditPayload.tenant_id;
      const retry = await supabase.from("audits").upsert(auditPayload, { onConflict: "id" });
      upsertError = retry.error;
    }

    if (upsertError && upsertError.message.includes("access_scope")) {
      delete auditPayload.access_scope;
      const retry = await supabase.from("audits").upsert(auditPayload, { onConflict: "id" });
      upsertError = retry.error;
    }

    if (upsertError) {
      console.error("[sync] Error al insertar auditoria en audits:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // 5. Upsert de todas as avaliações
    const evalRows = evaluations.map((ev) => ({
      audit_id: body.id,
      control_point_code: ev.code,
      category: ev.category,
      title: ev.title,
      score: ev.score,
      is_critical_ccp: ev.isCriticalCcp,
      observations: ev.observations,
      evidence_photo_url: ev.evidencePhoto?.url || null,
    }));

    if (evalRows.length > 0) {
      await supabase
        .from("audit_evaluations")
        .upsert(evalRows, { onConflict: "audit_id,control_point_code" });
    }

    return NextResponse.json({
      success: true,
      auditId: body.id,
      status: isFinalized ? "FINALIZED" : "IN_PROGRESS",
      complianceScore: report.globalPercentage,
      verdict: report.verdict,
    });
  } catch (err: any) {
    console.error("[sync] Error general en sync:", err);
    return NextResponse.json({ error: err.message || "Error al sincronizar auditoría" }, { status: 500 });
  }
}
