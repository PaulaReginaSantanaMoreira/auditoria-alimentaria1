import { SupabaseClient } from "@supabase/supabase-js";
import { IAuditRepository } from "@/domain/repositories/audit-repository.interface";
import { Audit, AuditStatus } from "@/domain/entities/audit";
import { Company } from "@/domain/entities/company";
import { Auditor } from "@/domain/entities/auditor";
import { ControlPointEvaluation, ControlPointCategory } from "@/domain/entities/control-point";
import { Cif } from "@/domain/value-objects/cif";
import { Score, AuditVerdict, EvaluationPointScore } from "@/domain/value-objects/score";
import { Signature } from "@/domain/value-objects/signature";
import { EvidencePhoto } from "@/domain/value-objects/evidence-photo";
import { AuditAccessScope } from "@/domain/security/roles-and-permissions";

/**
 * Repositório relacional de auditorias sanitárias.
 * Implementa IAuditRepository sem acoplamento a nomes de provedores específicos.
 */
export class AuditRepository implements IAuditRepository {
  constructor(private readonly dbClient: SupabaseClient) {}

  public async findById(id: string): Promise<Audit | null> {
    const { data: auditData, error: auditError } = await this.dbClient
      .from("audits")
      .select("*, company:companies(*), auditor:auditors(*)")
      .eq("id", id)
      .single();

    if (auditError || !auditData) return null;

    const { data: evalRows, error: evalError } = await this.dbClient
      .from("audit_evaluations")
      .select("*")
      .eq("audit_id", id);

    if (evalError) {
      throw new Error(`Erro ao carregar avaliações da auditoria: ${evalError.message}`);
    }

    return this.mapToEntity(auditData, evalRows || []);
  }

  /**
   * Busca todas as auditorias atribuídas a determinado auditor.
   * OTIMIZAÇÃO: Elimina o gargalo N+1 executando apenas 2 consultas em lote indexadas.
   */
  public async findByAuditorId(auditorId: string): Promise<Audit[]> {
    const { data: auditsData, error } = await this.dbClient
      .from("audits")
      .select("*, company:companies(*), auditor:auditors(*)")
      .eq("auditor_id", auditorId)
      .order("created_at", { ascending: false });

    if (error || !auditsData || auditsData.length === 0) return [];

    const auditIds = auditsData.map((a: { id: string }) => a.id);

    // Consulta em lote de todas as avaliações dos audits recuperados
    const { data: allEvaluations, error: evalError } = await this.dbClient
      .from("audit_evaluations")
      .select("*")
      .in("audit_id", auditIds);

    if (evalError) {
      throw new Error(`Erro ao carregar avaliações em lote: ${evalError.message}`);
    }

    // Agrupa as avaliações em memória por audit_id (O(N) in-memory)
    const evalMap = new Map<string, any[]>();
    for (const ev of allEvaluations || []) {
      const list = evalMap.get(ev.audit_id) || [];
      list.push(ev);
      evalMap.set(ev.audit_id, list);
    }

    return auditsData.map((auditRow: any) =>
      this.mapToEntity(auditRow, evalMap.get(auditRow.id) || [])
    );
  }

  /**
   * Busca todas as auditorias vinculadas a uma empresa (tenant).
   * Suporta filtro opcional por auditor e exclusão de auditorias invalidadas.
   */
  public async findByTenantId(
    tenantId: string,
    options?: { excludeInvalidated?: boolean; auditorId?: string }
  ): Promise<Audit[]> {
    let query = this.dbClient
      .from("audits")
      .select("*, company:companies(*), auditor:auditors(*), tenant:tenants(name)")
      .eq("tenant_id", tenantId);

    if (options?.auditorId) {
      query = query.eq("auditor_id", options.auditorId);
    }

    if (options?.excludeInvalidated) {
      query = query.neq("status", "INVALIDATED");
    }

    const { data: auditsData, error } = await query.order("created_at", { ascending: false });

    if (error || !auditsData || auditsData.length === 0) return [];

    const auditIds = auditsData.map((a: { id: string }) => a.id);

    const { data: allEvaluations } = await this.dbClient
      .from("audit_evaluations")
      .select("*")
      .in("audit_id", auditIds);

    const evalMap = new Map<string, any[]>();
    for (const ev of allEvaluations || []) {
      const list = evalMap.get(ev.audit_id) || [];
      list.push(ev);
      evalMap.set(ev.audit_id, list);
    }

    return auditsData.map((auditRow: any) =>
      this.mapToEntity(auditRow, evalMap.get(auditRow.id) || [])
    );
  }

  public async save(audit: Audit, options?: { tenantId?: string | null }): Promise<void> {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(audit.auditor.id);
      if (isUuid) {
        await this.dbClient.from("auditors").upsert({
          id: audit.auditor.id,
          full_name: audit.auditor.fullName || "Auditor Oficial BioAudit",
          official_id: `AUD-${audit.auditor.id.slice(0, 8).toUpperCase()}`,
          email: audit.auditor.email || "auditor@sanidad.es",
          is_active_subscription: true,
        }, { onConflict: "id" });
      }
    } catch {
      // Ignora erro auxiliar de auditor
    }

    const payload: Record<string, any> = {
      id: audit.id,
      auditor_id: audit.auditor.id,
      company_id: audit.company.id,
      inspection_date: audit.inspectionDate.toISOString().split("T")[0],
      status: audit.status,
      normative_framework: audit.normativeFramework,
      compliance_score: audit.score?.percentage ?? null,
      verdict: audit.verdict ?? null,
      access_scope: audit.accessScope,
      created_at: audit.createdAt.toISOString(),
      updated_at: audit.updatedAt.toISOString(),
    };

    if (options?.tenantId && options.tenantId !== "global") {
      payload.tenant_id = options.tenantId;
    } else {
      payload.tenant_id = null;
    }

    let { error: auditError } = await this.dbClient.from("audits").insert(payload);

    if (auditError && auditError.message.includes("tenant_id")) {
      delete payload.tenant_id;
      const retry = await this.dbClient.from("audits").insert(payload);
      auditError = retry.error;
    }

    if (auditError && auditError.message.includes("access_scope")) {
      delete payload.access_scope;
      const retry = await this.dbClient.from("audits").insert(payload);
      auditError = retry.error;
    }

    if (auditError) {
      throw new Error(`Erro ao salvar auditoria no banco: ${auditError.message}`);
    }

    const evalInserts = audit.evaluations.map((ev) => ({
      audit_id: audit.id,
      control_point_code: ev.code,
      category: ev.category,
      title: ev.title,
      score: ev.score,
      is_critical_ccp: ev.isCriticalCcp,
      observations: ev.observations,
      evidence_photo_url: ev.evidencePhoto?.url ?? null,
    }));

    if (evalInserts.length > 0) {
      const { error: evalError } = await this.dbClient
        .from("audit_evaluations")
        .upsert(evalInserts, { onConflict: "audit_id,control_point_code" });

      if (evalError) {
        throw new Error(`Erro ao salvar avaliações no banco: ${evalError.message}`);
      }
    }
  }

  public async update(audit: Audit): Promise<void> {
    const updatePayload: Record<string, any> = {
      status: audit.status,
      compliance_score: audit.score?.percentage ?? null,
      verdict: audit.verdict ?? null,
      auditor_signature_name: audit.auditorSignature?.signeeName ?? null,
      auditor_signature_url: audit.auditorSignature?.signatureDataUrl ?? null,
      audited_signature_name: audit.auditedSignature?.signeeName ?? null,
      audited_signature_url: audit.auditedSignature?.signatureDataUrl ?? null,
      access_scope: audit.accessScope,
      updated_at: new Date().toISOString(),
    };

    let { error: updateError } = await this.dbClient
      .from("audits")
      .update(updatePayload)
      .eq("id", audit.id);

    if (updateError && updateError.message.includes("access_scope")) {
      delete updatePayload.access_scope;
      const retry = await this.dbClient
        .from("audits")
        .update(updatePayload)
        .eq("id", audit.id);
      updateError = retry.error;
    }

    if (updateError) {
      throw new Error(`Erro ao atualizar auditoria: ${updateError.message}`);
    }

    const evalUpserts = audit.evaluations.map((ev) => ({
      audit_id: audit.id,
      control_point_code: ev.code,
      category: ev.category,
      title: ev.title,
      score: ev.score,
      is_critical_ccp: ev.isCriticalCcp,
      observations: ev.observations,
      evidence_photo_url: ev.evidencePhoto?.url ?? null,
    }));

    if (evalUpserts.length > 0) {
      const { error: evalError } = await this.dbClient
        .from("audit_evaluations")
        .upsert(evalUpserts, { onConflict: "audit_id,control_point_code" });

      if (evalError) {
        throw new Error(`Erro ao atualizar avaliações no banco: ${evalError.message}`);
      }
    }
  }

  public async delete(id: string): Promise<void> {
    const { error } = await this.dbClient.from("audits").delete().eq("id", id);
    if (error) {
      throw new Error(`Erro ao deletar auditoria: ${error.message}`);
    }
  }

  private mapToEntity(auditData: any, evalRows: any[]): Audit {
    const compData = auditData.company || {};
    const company = new Company({
      id: compData.id || auditData.company_id || "comp-default",
      name: compData.name || "Empresa Auditada",
      cif: new Cif(compData.cif || "B84920194"),
      address: compData.address || "Instalación Operativa",
      sanitaryRegistryNumber: compData.sanitary_registry_number,
      createdAt: compData.created_at ? new Date(compData.created_at) : new Date(),
    });

    const audData = auditData.auditor || {};
    const auditor = new Auditor({
      id: audData.id || auditData.auditor_id || "aud-default",
      authUserId: audData.auth_user_id || auditData.auditor_id,
      fullName: audData.full_name || "Auditor Oficial BioAudit",
      officialId: audData.official_id || "B-SANIDAD",
      email: audData.email || "auditor@sanidad.es",
      isActiveSubscription: audData.is_active_subscription ?? true,
    });

    const evaluations: ControlPointEvaluation[] = evalRows.map((row) => {
      let photo: EvidencePhoto | undefined;
      if (row.evidence_photo_url) {
        photo = new EvidencePhoto({ url: row.evidence_photo_url });
      }

      return new ControlPointEvaluation({
        code: row.control_point_code,
        title: row.title,
        category: row.category as ControlPointCategory,
        score: row.score as EvaluationPointScore,
        isCriticalCcp: Boolean(row.is_critical_ccp),
        observations: row.observations || "",
        evidencePhoto: photo,
      });
    });

    let score: Score | undefined;
    if (auditData.compliance_score !== null && auditData.compliance_score !== undefined) {
      score = new Score(auditData.compliance_score, 100);
    }

    let auditorSignature: Signature | undefined;
    if (auditData.auditor_signature_name && auditData.auditor_signature_url) {
      auditorSignature = new Signature({
        signeeName: auditData.auditor_signature_name,
        signeeRole: "Auditor",
        signatureDataUrl: auditData.auditor_signature_url,
      });
    }

    let auditedSignature: Signature | undefined;
    if (auditData.audited_signature_name && auditData.audited_signature_url) {
      auditedSignature = new Signature({
        signeeName: auditData.audited_signature_name,
        signeeRole: "Auditado",
        signatureDataUrl: auditData.audited_signature_url,
      });
    }

    return new Audit({
      id: auditData.id,
      company,
      auditor,
      tenantId: auditData.tenant_id,
      tenantName: auditData.tenant?.name || auditData.tenant_name,
      inspectionDate: new Date(auditData.inspection_date),
      normativeFramework: auditData.normative_framework,
      status: auditData.status as AuditStatus,
      evaluations,
      score,
      verdict: auditData.verdict as AuditVerdict | undefined,
      auditorSignature,
      auditedSignature,
      accessScope: (auditData.access_scope as AuditAccessScope) || "TENANT",
      invalidatedAt: auditData.invalidated_at ? new Date(auditData.invalidated_at) : undefined,
      invalidatedBy: auditData.invalidated_by,
      invalidationReason: auditData.invalidation_reason,
      createdAt: new Date(auditData.created_at),
      updatedAt: new Date(auditData.updated_at),
    });
  }
}

// Alias de compatibilidade retroativa para não quebrar imports existentes
export const SupabaseAuditRepository = AuditRepository;
