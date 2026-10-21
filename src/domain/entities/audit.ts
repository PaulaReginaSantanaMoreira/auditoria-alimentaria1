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

export type AuditStatus = "DRAFT" | "IN_PROGRESS" | "EVALUATED" | "SIGNED" | "FINALIZED";

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
    this._createdAt = params.createdAt || new Date();
    this._updatedAt = params.updatedAt || new Date();
  }

  public get id(): string {
    return this._id;
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

  public finalize(requiredTotalPoints = 30): void {
    if (this._evaluations.size < requiredTotalPoints) {
      throw new IncompleteAuditError(this._evaluations.size, requiredTotalPoints);
    }

    if (!this._auditorSignature) throw new MissingSignatureError("Auditor");
    if (!this._auditedSignature) throw new MissingSignatureError("Auditado");

    this.recalculateScore();
    this._status = "FINALIZED";
    this._updatedAt = new Date();
  }
}
