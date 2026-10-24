import { Company } from "./company";
import { Auditor } from "./auditor";
import { ControlPointEvaluation } from "./control-point";
import { Score, AuditVerdict, EvaluationPointScore } from "../value-objects/score";
import { Signature } from "../value-objects/signature";
import { AuditAccessScope } from "../security/roles-and-permissions";
import {
  AuditAlreadyFinalizedError,
  IncompleteAuditError,
  MissingSignatureError,
} from "../errors/domain-error";

export type AuditStatus = "DRAFT" | "IN_PROGRESS" | "EVALUATED" | "SIGNED" | "FINALIZED" | "INVALIDATED";

export class Audit {
  private readonly _id: string;
  private readonly _company: Company;
  private readonly _auditor: Auditor;
  private readonly _inspectionDate: Date;
  private readonly _normativeFramework: string;
  private _status: AuditStatus;
  private _evaluations: Map<string, ControlPointEvaluation>;
  private _score?: Score;
  private _verdict?: AuditVerdict;
  private _auditorSignature?: Signature;
  private _auditedSignature?: Signature;
  private _accessScope: AuditAccessScope;
  private _tenantId?: string;
  private _tenantName?: string;
  private _invalidatedAt?: Date;
  private _invalidatedBy?: string;
  private _invalidationReason?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(params: {
    id: string;
    company: Company;
    auditor: Auditor;
    inspectionDate: Date;
    normativeFramework?: string;
    status?: AuditStatus;
    evaluations?: ControlPointEvaluation[];
    score?: Score;
    verdict?: AuditVerdict;
    auditorSignature?: Signature;
    auditedSignature?: Signature;
    accessScope?: AuditAccessScope;
    tenantId?: string;
    tenantName?: string;
    invalidatedAt?: Date;
    invalidatedBy?: string;
    invalidationReason?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this._id = params.id;
    this._company = params.company;
    this._auditor = params.auditor;
    this._inspectionDate = params.inspectionDate;
    this._normativeFramework = params.normativeFramework || "Reglamento (CE) 852/2004 · APPCC / ISO 22000";
    this._status = params.status || "DRAFT";
    this._evaluations = new Map();
    if (params.evaluations) {
      for (const ev of params.evaluations) {
        this._evaluations.set(ev.code, ev);
      }
    }
    this._score = params.score;
    this._verdict = params.verdict;
    this._auditorSignature = params.auditorSignature;
    this._auditedSignature = params.auditedSignature;
    this._accessScope = params.accessScope ?? "TENANT";
    this._tenantId = params.tenantId;
    this._tenantName = params.tenantName;
    this._invalidatedAt = params.invalidatedAt;
    this._invalidatedBy = params.invalidatedBy;
    this._invalidationReason = params.invalidationReason;
    this._createdAt = params.createdAt || new Date();
    this._updatedAt = params.updatedAt || new Date();
  }

  public get id(): string {
    return this._id;
  }

  public get tenantId(): string | undefined {
    return this._tenantId;
  }

  public get tenantName(): string | undefined {
    return this._tenantName;
  }

  public get accessScope(): AuditAccessScope {
    return this._accessScope;
  }

  public isConfidential(): boolean {
    return this._accessScope === "CONFIDENTIAL";
  }

  public get company(): Company {
    return this._company;
  }

  public get auditor(): Auditor {
    return this._auditor;
  }

  public get inspectionDate(): Date {
    return this._inspectionDate;
  }

  public get normativeFramework(): string {
    return this._normativeFramework;
  }

  public get status(): AuditStatus {
    return this._status;
  }

  public get evaluations(): ControlPointEvaluation[] {
    return Array.from(this._evaluations.values());
  }

  public get score(): Score | undefined {
    return this._score;
  }

  public get verdict(): AuditVerdict | undefined {
    return this._verdict;
  }

  public get auditorSignature(): Signature | undefined {
    return this._auditorSignature;
  }

  public get auditedSignature(): Signature | undefined {
    return this._auditedSignature;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public getEvaluationByCode(code: string): ControlPointEvaluation | undefined {
    return this._evaluations.get(code);
  }

  public addOrUpdateEvaluation(evaluation: ControlPointEvaluation): void {
    if (this._status === "FINALIZED") {
      throw new AuditAlreadyFinalizedError(this._id);
    }

    this._evaluations.set(evaluation.code, evaluation);
    this._status = "IN_PROGRESS";
    this._updatedAt = new Date();
    this.recalculateScore();
  }

  public evaluatePoint(params: {
    code: string;
    score: EvaluationPointScore;
    observations?: string;
    photoUrl?: string;
  }): void {
    if (this._status === "FINALIZED") {
      throw new AuditAlreadyFinalizedError(this._id);
    }

    const current = this._evaluations.get(params.code);
    if (current) {
      current.updateEvaluation({
        score: params.score,
        observations: params.observations,
      });
    }

    this._status = "IN_PROGRESS";
    this._updatedAt = new Date();
    this.recalculateScore();
  }

  public recalculateScore(): Score {
    const list = Array.from(this._evaluations.values());
    const scores = list.map((e) => e.score);
    this._score = Score.fromEvaluationList(scores);

    const hasCriticalFailure = list.some((e) => e.isCriticalCcp && e.score === 0);
    this._verdict = this._score.calculateVerdict(hasCriticalFailure);

    return this._score;
  }

  public sign(auditorSig: Signature, auditedSig: Signature): void {
    if (this._status === "FINALIZED") {
      throw new AuditAlreadyFinalizedError(this._id);
    }

    if (!auditorSig) throw new MissingSignatureError("Auditor");
    if (!auditedSig) throw new MissingSignatureError("Auditado");

    this._auditorSignature = auditorSig;
    this._auditedSignature = auditedSig;
    this._status = "SIGNED";
    this._updatedAt = new Date();
  }

  public get isInvalidated(): boolean {
    return this._status === "INVALIDATED";
  }

  public get invalidatedAt(): Date | undefined {
    return this._invalidatedAt;
  }

  public get invalidatedBy(): string | undefined {
    return this._invalidatedBy;
  }

  public get invalidationReason(): string | undefined {
    return this._invalidationReason;
  }

  public invalidate(params: { reason: string; invalidatedBy: string }): void {
    if (this._status === "INVALIDATED") {
      throw new Error("La auditoría ya se encuentra invalidada");
    }
    if (!params.reason || params.reason.trim().length === 0) {
      throw new Error("Es obligatorio registrar el motivo técnico/legal para invalidar una inspección.");
    }
    if (!params.invalidatedBy) {
      throw new Error("Identificación del responsable de invalidación requerida.");
    }
    this._status = "INVALIDATED";
    this._invalidationReason = params.reason.trim();
    this._invalidatedBy = params.invalidatedBy;
    this._invalidatedAt = new Date();
    this._updatedAt = new Date();
  }

  public finalize(requiredTotalPoints?: number): void {
    const required = requiredTotalPoints !== undefined ? requiredTotalPoints : (this._evaluations.size || 30);
    if (this._evaluations.size < required) {
      throw new IncompleteAuditError(this._evaluations.size, required);
    }

    if (!this._auditorSignature) throw new MissingSignatureError("Auditor");
    if (!this._auditedSignature) throw new MissingSignatureError("Auditado");

    this.recalculateScore();
    this._status = "FINALIZED";
    this._updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this._id,
      company: this._company?.toJSON ? this._company.toJSON() : {
        id: this._company.id,
        name: this._company.name,
        cif: this._company.cif?.value || this._company.cif,
        address: this._company.address,
        sanitaryRegistryNumber: this._company.sanitaryRegistryNumber,
      },
      auditor: this._auditor?.toJSON ? this._auditor.toJSON() : {
        id: this._auditor.id,
        authUserId: this._auditor.authUserId,
        fullName: this._auditor.fullName,
        officialId: this._auditor.officialId,
        email: this._auditor.email,
      },
      inspectionDate: this._inspectionDate.toISOString(),
      normativeFramework: this._normativeFramework,
      status: this._status,
      evaluations: this.evaluations.map((e) => ({
        code: e.code,
        title: e.title,
        category: e.category,
        isCriticalCcp: e.isCriticalCcp,
        score: e.score,
        observations: e.observations,
        evidencePhoto: e.evidencePhoto ? { url: e.evidencePhoto.url } : undefined,
      })),
      score: this._score ? {
        obtainedPoints: this._score.obtainedPoints,
        maxPoints: this._score.maxPoints,
        percentage: this._score.percentage,
      } : undefined,
      verdict: this._verdict,
      auditorSignature: this._auditorSignature ? {
        signeeName: this._auditorSignature.signeeName,
        signeeRole: this._auditorSignature.signeeRole,
        signatureDataUrl: this._auditorSignature.signatureDataUrl,
        signedAt: typeof this._auditorSignature.signedAt === "object" ? this._auditorSignature.signedAt.toISOString() : this._auditorSignature.signedAt,
      } : undefined,
      auditedSignature: this._auditedSignature ? {
        signeeName: this._auditedSignature.signeeName,
        signeeRole: this._auditedSignature.signeeRole,
        signatureDataUrl: this._auditedSignature.signatureDataUrl,
        signedAt: typeof this._auditedSignature.signedAt === "object" ? this._auditedSignature.signedAt.toISOString() : this._auditedSignature.signedAt,
      } : undefined,
      accessScope: this._accessScope,
      tenantId: this._tenantId,
      tenantName: this._tenantName,
      invalidatedAt: this._invalidatedAt?.toISOString(),
      invalidatedBy: this._invalidatedBy,
      invalidationReason: this._invalidationReason,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
