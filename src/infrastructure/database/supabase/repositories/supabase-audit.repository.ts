import { SupabaseClient } from "@supabase/supabase-js";
import { IAuditRepository } from "../../../../domain/repositories/audit-repository.interface";
import { Audit, AuditStatus } from "../../../../domain/entities/audit";
import { Company } from "../../../../domain/entities/company";
import { Auditor } from "../../../../domain/entities/auditor";
import { ControlPointEvaluation, ControlPointCategory } from "../../../../domain/entities/control-point";
import { Cif } from "../../../../domain/value-objects/cif";
import { Score, AuditVerdict, EvaluationPointScore } from "../../../../domain/value-objects/score";
import { Signature } from "../../../../domain/value-objects/signature";
import { EvidencePhoto } from "../../../../domain/value-objects/evidence-photo";

export class SupabaseAuditRepository implements IAuditRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  public async findById(id: string): Promise<Audit | null> {
    const { data: auditData, error: auditError } = await this.supabase
      .from("audits")
      .select("*, company:companies(*), auditor:auditors(*)")
      .eq("id", id)
      .single();

    if (auditError || !auditData) return null;

    const { data: evalRows, error: evalError } = await this.supabase
      .from("audit_evaluations")
      .select("*")
      .eq("audit_id", id);

    if (evalError) {
      throw new Error(`Erro ao carregar avaliações da auditoria: ${evalError.message}`);
    }

    const company = new Company({
      id: auditData.company.id,
      name: auditData.company.name,
      cif: new Cif(auditData.company.cif),
      address: auditData.company.address,
      sanitaryRegistryNumber: auditData.company.sanitary_registry_number,
      createdAt: new Date(auditData.company.created_at),
    });

    const auditor = new Auditor({
      id: auditData.auditor.id,
      authUserId: auditData.auditor.auth_user_id,
      fullName: auditData.auditor.full_name,
      officialId: auditData.auditor.official_id,
      email: auditData.auditor.email,
      isActiveSubscription: auditData.auditor.is_active_subscription,
    });

    const evaluations: ControlPointEvaluation[] = (evalRows || []).map((row) => {
      let photo: EvidencePhoto | undefined;
      if (row.evidence_photo_url) {
        photo = new EvidencePhoto({ url: row.evidence_photo_url });
      }

      return new ControlPointEvaluation({
        code: row.control_point_code,
        title: row.title,
        category: row.category as ControlPointCategory,
        isCriticalCcp: row.is_critical_ccp,
        score: row.score as EvaluationPointScore,
        observations: row.observations || "",
        evidencePhoto: photo,
      });
    });

    let auditorSignature: Signature | undefined;
    if (auditData.auditor_signature_url && auditData.auditor_signature_name) {
      auditorSignature = new Signature({
        signeeName: auditData.auditor_signature_name,
        signeeRole: "Auditor",
        signatureDataUrl: auditData.auditor_signature_url,
      });
    }

    let auditedSignature: Signature | undefined;
    if (auditData.audited_signature_url && auditData.audited_signature_name) {
      auditedSignature = new Signature({
        signeeName: auditData.audited_signature_name,
        signeeRole: "Auditado",
        signatureDataUrl: auditData.audited_signature_url,
      });
    }

    let score: Score | undefined;
    if (auditData.compliance_score !== null) {
      score = Score.fromEvaluationList(evaluations.map((e) => e.score));
    }

    return new Audit({
      id: auditData.id,
      company,
      auditor,
      inspectionDate: new Date(auditData.inspection_date),
      normativeFramework: auditData.normative_framework,
      status: auditData.status as AuditStatus,
      evaluations,
      score,
      verdict: auditData.verdict as AuditVerdict | undefined,
      auditorSignature,
      auditedSignature,
      createdAt: new Date(auditData.created_at),
      updatedAt: new Date(auditData.updated_at),
    });
  }

  public async findByAuditorId(auditorId: string): Promise<Audit[]> {
    const { data: auditsData, error } = await this.supabase
      .from("audits")
      .select("id")
      .eq("auditor_id", auditorId)
      .order("created_at", { ascending: false });

    if (error || !auditsData) return [];

    const audits: Audit[] = [];
    for (const item of auditsData) {
      const a = await this.findById(item.id);
      if (a) audits.push(a);
    }
    return audits;
  }

  public async save(audit: Audit): Promise<void> {
    const { error: auditError } = await this.supabase.from("audits").insert({
      id: audit.id,
      auditor_id: audit.auditor.id,
      company_id: audit.company.id,
      inspection_date: audit.inspectionDate.toISOString().split("T")[0],
      status: audit.status,
      normative_framework: audit.normativeFramework,
      compliance_score: audit.score?.percentage ?? null,
      verdict: audit.verdict ?? null,
      created_at: audit.createdAt.toISOString(),
      updated_at: audit.updatedAt.toISOString(),
    });

    if (auditError) {
      throw new Error(`Erro ao salvar auditoria no Supabase: ${auditError.message}`);
    }

    // Insere os pontos de controle
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
      const { error: evalError } = await this.supabase
        .from("audit_evaluations")
        .upsert(evalInserts, { onConflict: "audit_id,control_point_code" });

      if (evalError) {
        throw new Error(`Erro ao salvar avaliações no Supabase: ${evalError.message}`);
      }
    }
  }

  public async update(audit: Audit): Promise<void> {
    const { error: auditError } = await this.supabase
      .from("audits")
      .update({
        status: audit.status,
        compliance_score: audit.score?.percentage ?? null,
        verdict: audit.verdict ?? null,
        auditor_signature_name: audit.auditorSignature?.signeeName ?? null,
        auditor_signature_url: audit.auditorSignature?.signatureDataUrl ?? null,
        audited_signature_name: audit.auditedSignature?.signeeName ?? null,
        audited_signature_url: audit.auditedSignature?.signatureDataUrl ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", audit.id);

    if (auditError) {
      throw new Error(`Erro ao atualizar auditoria no Supabase: ${auditError.message}`);
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
      updated_at: new Date().toISOString(),
    }));

    if (evalUpserts.length > 0) {
      const { error: evalError } = await this.supabase
        .from("audit_evaluations")
        .upsert(evalUpserts, { onConflict: "audit_id,control_point_code" });

      if (evalError) {
        throw new Error(`Erro ao atualizar avaliações no Supabase: ${evalError.message}`);
      }
    }
  }

  public async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from("audits").delete().eq("id", id);
    if (error) {
      throw new Error(`Erro ao excluir auditoria no Supabase: ${error.message}`);
    }
  }
}
