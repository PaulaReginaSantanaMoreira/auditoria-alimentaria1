import { EvaluationPointScore } from "../value-objects/score";
import { EvidencePhoto } from "../value-objects/evidence-photo";

export type ControlPointCategory =
  | "INFRAESTRUCTURA"
  | "HIGIENE_PERSONAL"
  | "APPCC_FRIO_PROCESOS";

export class ControlPointEvaluation {
  private readonly _code: string;
  private readonly _title: string;
  private readonly _category: ControlPointCategory;
  private readonly _isCriticalCcp: boolean;
  private _score: EvaluationPointScore;
  private _observations: string;
  private _evidencePhoto?: EvidencePhoto;

  constructor(params: {
    code: string;
    title: string;
    category: ControlPointCategory;
    isCriticalCcp?: boolean;
    score?: EvaluationPointScore;
    observations?: string;
    evidencePhoto?: EvidencePhoto;
  }) {
    if (!params.code || params.code.trim().length === 0) {
      throw new Error("O código do ponto de controle é obrigatório.");
    }
    if (!params.title || params.title.trim().length === 0) {
      throw new Error("O título do ponto de controle é obrigatório.");
    }

    this._code = params.code.trim();
    this._title = params.title.trim();
    this._category = params.category;
    this._isCriticalCcp = params.isCriticalCcp ?? false;
    this._score = params.score ?? 0;
    this._observations = params.observations?.trim() || "";
    this._evidencePhoto = params.evidencePhoto;
  }

  public get code(): string {
    return this._code;
  }

  public get title(): string {
    return this._title;
  }

  public get category(): ControlPointCategory {
    return this._category;
  }

  public get isCriticalCcp(): boolean {
    return this._isCriticalCcp;
  }

  public get score(): EvaluationPointScore {
    return this._score;
  }

  public get observations(): string {
    return this._observations;
  }

  public get evidencePhoto(): EvidencePhoto | undefined {
    return this._evidencePhoto;
  }

  public updateEvaluation(params: {
    score: EvaluationPointScore;
    observations?: string;
    evidencePhoto?: EvidencePhoto;
  }): void {
    this._score = params.score;
    if (params.observations !== undefined) {
      this._observations = params.observations.trim();
    }
    if (params.evidencePhoto !== undefined) {
      this._evidencePhoto = params.evidencePhoto;
    }
  }

  public removePhoto(): void {
    this._evidencePhoto = undefined;
  }
}
