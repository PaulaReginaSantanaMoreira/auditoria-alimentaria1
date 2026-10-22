import { InvalidScoreError } from "../errors/domain-error";

export type EvaluationPointScore = 0 | 1 | 2 | "na";

export enum AuditVerdict {
  FAVORABLE = "FAVORABLE",
  FAVORABLE_CONDITIONAL = "FAVORABLE_CONDICIONAL",
  UNFAVORABLE = "DESFAVORABLE",
}

export class Score {
  private readonly _percentage: number;
  private readonly _obtainedPoints: number;
  private readonly _maxPoints: number;

  constructor(obtainedPoints: number, maxPoints: number) {
    if (maxPoints <= 0) {
      this._percentage = 100;
      this._obtainedPoints = 0;
      this._maxPoints = 0;
      return;
    }

    if (obtainedPoints < 0 || obtainedPoints > maxPoints) {
      throw new InvalidScoreError(obtainedPoints);
    }

    this._obtainedPoints = obtainedPoints;
    this._maxPoints = maxPoints;
    this._percentage = Math.round((obtainedPoints / maxPoints) * 100);
  }

  public get percentage(): number {
    return this._percentage;
  }

  public get obtainedPoints(): number {
    return this._obtainedPoints;
  }

  public get maxPoints(): number {
    return this._maxPoints;
  }

  public calculateVerdict(hasCriticalCcpFailure: boolean): AuditVerdict {
    // Si falla cualquier punto crítico de control (CCP), el veredicto es desfavorable inmediato
    if (hasCriticalCcpFailure || this._percentage < 70) {
      return AuditVerdict.UNFAVORABLE;
    }

    if (this._percentage >= 90) {
      return AuditVerdict.FAVORABLE;
    } else {
      return AuditVerdict.FAVORABLE_CONDITIONAL;
    }
  }

  public static fromEvaluationList(
    scores: EvaluationPointScore[],
    weights?: number[]
  ): Score {
    if (scores.length === 0) {
      return new Score(0, 0);
    }

    let obtained = 0;
    let max = 0;

    for (let i = 0; i < scores.length; i++) {
      const s = scores[i];
      if (s === "na") continue; // Ponto No Aplicable não pontua nem penaliza o total máximo
      const weight = weights && weights[i] ? weights[i] : 1;
      obtained += s * weight;
      max += 2 * weight;
    }

    return new Score(obtained, max);
  }

  public toJSON() {
    return {
      obtainedPoints: this._obtainedPoints,
      maxPoints: this._maxPoints,
      percentage: this._percentage,
    };
  }
}
